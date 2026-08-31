// ============================================================
// app/api/assistant/route.ts — the only place that talks to
// OpenRouter. OPENROUTER_API_KEY is read from process.env here and
// never sent to the browser in any form (not in the response body,
// not in a header, not inlined into client JS — it's a server-only
// env var with no NEXT_PUBLIC_ prefix, so Next.js never bundles it
// client-side to begin with).
//
// Wire protocol to the browser is UNCHANGED from the original
// Anthropic-backed implementation — text/event-stream, each event a
// single JSON line:
//   {"type":"text","delta":"..."}      one streamed text chunk
//   {"type":"products","items":[...]}  real catalog matches from the
//                                       search_products tool
//   {"type":"done"}                    generation finished normally
//   {"type":"error","message":"..."}   something failed mid-stream
// This is deliberate: context/AIAssistantContext.tsx and
// components/AIAssistantPanel.tsx speak THIS protocol, not OpenRouter's
// — so swapping the upstream provider required zero changes on the
// client side. Only what happens between this file and OpenRouter
// changed.
// ============================================================
import {
  OPENROUTER_API_URL,
  OPENROUTER_APP_TITLE,
  OPENROUTER_MODEL,
  MAX_OUTPUT_TOKENS,
  MAX_TOOL_ROUNDS,
  SEARCH_PRODUCTS_TOOL,
  SYSTEM_PROMPT,
  executeSearchProducts,
  isFreeModelId,
  NON_FREE_MODEL_ERROR,
} from "@/lib/ai";

export const runtime = "nodejs";

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Thrown when OpenRouter itself is unreachable, rate-limiting the free
// tier, or otherwise failing upstream — carries a message that's
// already safe to show the user as-is (no raw response bodies, no
// secrets), so the stream's catch block can forward it verbatim
// instead of masking it with the generic fallback.
class UpstreamUnavailableError extends Error {}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Caught here, before any stream starts, so the client gets a
    // normal JSON error it can show plainly — not a secret, not a
    // stack trace, just "this isn't configured yet".
    return jsonError("The AI assistant isn't configured yet (missing server API key).", 503);
  }

  // Never make a request that could cost money — see lib/ai.ts's
  // isFreeModelId. This is checked on every request, not just at
  // startup, so an env var edited without a restart (or a future
  // OpenRouter naming change) can't silently slip a paid call through.
  if (!isFreeModelId(OPENROUTER_MODEL)) {
    return jsonError(NON_FREE_MODEL_ERROR, 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const rawMessages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return jsonError("No messages provided.", 400);
  }

  const messages: ClientMessage[] = [];
  for (const m of rawMessages.slice(-MAX_MESSAGES)) {
    if (
      !m ||
      typeof m !== "object" ||
      (m as ClientMessage).role !== "user" && (m as ClientMessage).role !== "assistant" ||
      typeof (m as ClientMessage).content !== "string"
    ) {
      continue;
    }
    const content = (m as ClientMessage).content.slice(0, MAX_MESSAGE_LENGTH).trim();
    if (content) messages.push({ role: (m as ClientMessage).role, content });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return jsonError("The last message must be from the user.", 400);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      function send(payload: Record<string, unknown>) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // Connection already gone (client aborted) — nothing to do.
        }
      }

      try {
        await runConversation(messages, apiKey, request.signal, send);
        send({ type: "done" });
      } catch (err) {
        // AbortError means the CLIENT cancelled (Stop button) — that's
        // not a failure to report, the client already knows it asked
        // to stop and keeps whatever text it already streamed.
        if (err instanceof Error && err.name === "AbortError") {
          // no-op
        } else if (err instanceof UpstreamUnavailableError) {
          send({ type: "error", message: err.message });
        } else {
          send({ type: "error", message: "The assistant hit an error generating a response. Please try again." });
        }
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // Already closed by the client disconnecting.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function safeParseJSON(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text || "{}");
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

interface PendingToolCall {
  id?: string;
  name?: string;
  args: string;
}

interface OpenRouterChunk {
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  error?: { message?: string };
}

// The tool-use loop: stream text as it arrives; if the model asks to
// call search_products, run it against the REAL catalog (see
// lib/ai.ts), feed the result back, and stream the follow-up turn —
// same AbortSignal threaded through every upstream call, so a client
// cancellation actually stops the upstream generation too, not just
// the UI.
//
// OpenRouter speaks the OpenAI Chat Completions wire format: streamed
// chunks are `data: {...}\n\n` lines (terminated by a literal
// `data: [DONE]`), each chunk carrying a `choices[0].delta` with
// either `content` (text) or `tool_calls` (an array of PARTIAL tool
// call fragments, matched up across chunks by `index` — the same
// incremental-JSON-string-building shape Anthropic's `input_json_delta`
// used, just under a different field name).
async function runConversation(
  initialMessages: ClientMessage[],
  apiKey: string,
  signal: AbortSignal,
  send: (payload: Record<string, unknown>) => void
): Promise<void> {
  const orMessages: Array<Record<string, unknown>> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...initialMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        // Both purely cosmetic (OpenRouter's own request attribution) —
        // never anything secret, safe even if logged.
        "http-referer": "https://tradehub.local",
        "x-title": OPENROUTER_APP_TITLE,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: orMessages,
        tools: [SEARCH_PRODUCTS_TOOL],
        stream: true,
      }),
      signal,
    });

    if (!res.ok || !res.body) {
      // Free-tier rate limits (20 req/min, 200 req/day per OpenRouter's
      // published free-model limits) surface as 429; treat any
      // non-2xx upstream response the same honest way — never invent
      // a fallback response, never fall back to a different (possibly
      // paid) model.
      if (res.status === 429) {
        throw new UpstreamUnavailableError(
          "The free AI service is temporarily unavailable (rate-limited). Please wait a moment and try again."
        );
      }
      throw new UpstreamUnavailableError(
        "The free AI service is temporarily unavailable right now. Please try again shortly."
      );
    }

    const toolCalls = new Map<number, PendingToolCall>();
    let assistantText = "";
    let finishReason: string | null = null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        for (const line of rawEvent.split("\n")) {
          if (!line.startsWith("data:")) continue; // ignores SSE comment/keep-alive lines (e.g. ": OPENROUTER PROCESSING")
          const raw = line.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;

          let payload: OpenRouterChunk;
          try {
            payload = JSON.parse(raw);
          } catch {
            continue;
          }

          if (payload.error) {
            throw new UpstreamUnavailableError(
              "The free AI service is temporarily unavailable right now. Please try again shortly."
            );
          }

          const choice = payload.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;
          if (delta?.content) {
            assistantText += delta.content;
            // Streamed to the browser THE MOMENT it arrives — this is
            // the real per-token forwarding FE-06 requires, not a
            // buffer-then-flush.
            send({ type: "text", delta: delta.content });
          }
          if (Array.isArray(delta?.tool_calls)) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              const existing = toolCalls.get(idx) ?? { args: "" };
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments) existing.args += tc.function.arguments;
              toolCalls.set(idx, existing);
            }
          }
          if (choice.finish_reason) finishReason = choice.finish_reason;
        }
      }
    }

    if (finishReason !== "tool_calls" || toolCalls.size === 0) {
      // A normal finished turn — nothing more to do, the "done" event
      // is sent by the caller once this function returns.
      return;
    }

    // The model asked to call search_products. Append its own turn
    // (verbatim, including the tool_calls array — the API requires the
    // full prior assistant turn before a tool result can follow it),
    // then run the tool for real and append one "tool" role message
    // per call id (OpenAI-format APIs require exactly one response per
    // tool_call_id that was issued).
    const orderedCalls = [...toolCalls.entries()].sort(([a], [b]) => a - b);
    const toolCallsForApi = orderedCalls.map(([idx, tc]) => ({
      id: tc.id || `call_${idx}`,
      type: "function" as const,
      function: { name: tc.name || "", arguments: tc.args || "{}" },
    }));
    orMessages.push({ role: "assistant", content: assistantText || null, tool_calls: toolCallsForApi });

    for (const call of toolCallsForApi) {
      if (call.function.name === "search_products") {
        const input = safeParseJSON(call.function.arguments);
        const result = executeSearchProducts(input);
        if (result.results.length > 0) {
          send({ type: "products", items: result.results });
        }
        orMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      } else {
        // Only one tool is ever declared, so this shouldn't happen —
        // but every issued tool_call_id still needs a response or the
        // next request is rejected by the API.
        orMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ error: "Unknown tool" }) });
      }
    }
    // Loop again: the next iteration streams the model's follow-up
    // answer now that it has real product data.
  }
}
