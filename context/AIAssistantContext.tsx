"use client";

// ============================================================
// context/AIAssistantContext.tsx — the AI Shopping Assistant's client
// state: whether the panel is open, and the conversation itself.
// Mounted once in app/layout.tsx (same "one Provider, one hook"
// pattern as every other context in this app), so the conversation
// survives closing and reopening the panel — it only resets on a full
// page reload, same as Cart/Wishlist's own in-memory-plus-localStorage
// model, minus the localStorage part (a demo chat history isn't worth
// persisting across visits the way a cart is).
//
// Split into TWO contexts on purpose: AIAssistantUIContext (open/
// toggle) barely ever changes, while AIAssistantChatContext's value
// changes on every streamed token. If they were one context, the
// navbar button (which only needs open/toggle) would re-render on
// every token too — this split is what "don't re-render the app for
// every streamed token" (see the panel itself) actually depends on.
// ============================================================
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { ToolProductResult } from "@/lib/ai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Real catalog matches attached to this specific assistant message
   * (from the search_products tool) — see route.ts's "products" event. */
  products?: ToolProductResult[];
  /** Set on the one assistant message a stream error interrupted, so
   * the bubble itself can show it inline rather than losing where in
   * the conversation it happened. */
  error?: string;
}

interface UIContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
  openPanel: () => void;
  /** The navbar "AI Assistant" button, registered by AIAssistantButton
   * itself (its own `ref={triggerRef}`). Shared via context, not a
   * local ref, because the trigger and the panel that needs to return
   * focus to it on close are separate sibling components. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}

interface ChatContextValue {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (text: string) => void;
  stop: () => void;
}

const AIAssistantUIContext = createContext<UIContextValue | undefined>(undefined);
const AIAssistantChatContext = createContext<ChatContextValue | undefined>(undefined);

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
}

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);
  const openPanel = useCallback(() => setOpen(true), []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || abortRef.current) return; // no empty sends, no overlapping sends

    const userMessage: ChatMessage = { id: newId(), role: "user", content: trimmed };
    const assistantId = newId();
    const assistantPlaceholder: ChatMessage = { id: assistantId, role: "assistant", content: "" };

    // Functional update so this reads the LATEST messages even if
    // called again before a re-render lands — the history sent to the
    // server below is built from this same snapshot, not stale state.
    let historyForRequest: ChatMessage[] = [];
    setMessages((prev) => {
      historyForRequest = [...prev, userMessage];
      return [...historyForRequest, assistantPlaceholder];
    });

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    (async () => {
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: historyForRequest.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let message = "Something went wrong reaching the assistant.";
          try {
            const data = await res.json();
            if (data?.error) message = data.error;
          } catch {
            // Non-JSON error body — keep the generic message.
          }
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, error: message } : m)));
          return;
        }

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
            const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;

            let payload: { type: string; delta?: string; items?: ToolProductResult[]; message?: string };
            try {
              payload = JSON.parse(dataLine.slice(5).trim());
            } catch {
              continue;
            }

            if (payload.type === "text" && payload.delta) {
              const delta = payload.delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m))
              );
            } else if (payload.type === "products" && payload.items) {
              const items = payload.items;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, products: [...(m.products ?? []), ...items] } : m
                )
              );
            } else if (payload.type === "error") {
              const message = payload.message || "The assistant hit an error.";
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, error: message } : m)));
            }
            // "done" needs no handling — the loop just ends naturally.
          }
        }
      } catch (err) {
        // AbortError = the user clicked Stop. That's success, not a
        // failure: whatever text already streamed into this message
        // (via the setMessages calls above) stays exactly as it was —
        // nothing here removes or resets it.
        if (!(err instanceof Error && err.name === "AbortError")) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, error: m.error ?? "Network error — the assistant couldn't be reached." }
                : m
            )
          );
        }
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    })();
  }, []);

  const uiValue = useMemo(
    () => ({ open, toggle, close, openPanel, triggerRef }),
    [open, toggle, close, openPanel, triggerRef]
  );
  const chatValue = useMemo(
    () => ({ messages, isStreaming, sendMessage, stop }),
    [messages, isStreaming, sendMessage, stop]
  );

  return (
    <AIAssistantUIContext.Provider value={uiValue}>
      <AIAssistantChatContext.Provider value={chatValue}>{children}</AIAssistantChatContext.Provider>
    </AIAssistantUIContext.Provider>
  );
}

export function useAIAssistantUI(): UIContextValue {
  const ctx = useContext(AIAssistantUIContext);
  if (!ctx) throw new Error("useAIAssistantUI must be used within an AIAssistantProvider");
  return ctx;
}

export function useAIAssistantChat(): ChatContextValue {
  const ctx = useContext(AIAssistantChatContext);
  if (!ctx) throw new Error("useAIAssistantChat must be used within an AIAssistantProvider");
  return ctx;
}
