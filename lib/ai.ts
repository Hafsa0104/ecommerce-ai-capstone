// ============================================================
// lib/ai.ts — the ONE place the AI Shopping Assistant's model,
// system prompt, and tool configuration live. app/api/assistant/
// route.ts imports from here; nothing else needs to know the model
// name or prompt wording. Server-only (touches process.env directly
// and is only ever imported by the route handler) — never import this
// from a "use client" file.
//
// Provider: OpenRouter (https://openrouter.ai), NOT Anthropic directly.
// This project must never incur AI API cost, so this file only ever
// points at OpenRouter's FREE model pool — see FREE_MODEL_ERROR below
// for the hard guard that enforces that even if OPENROUTER_MODEL is
// misconfigured.
//
// OpenRouter's chat/completions endpoint is OpenAI-compatible (request
// shape, streaming SSE chunk shape, and tool-calling shape all follow
// the OpenAI Chat Completions API), which is why route.ts's parser
// looks like an OpenAI SSE parser rather than the Anthropic one this
// file used to configure. Deliberately no `openai` SDK dependency
// either: same reasoning as before — one documented HTTP+SSE endpoint,
// a raw fetch() is less surface area than a full SDK for one streaming
// call with one tool.
// ============================================================
import { filterProducts, type ListingFilters } from "@/services/productService";
import { CATEGORY_LABELS } from "@/services/productData";
import type { CategoryKey } from "@/types/product";

// OpenRouter's own free-model router: it selects among whichever free
// (`:free`-suffixed) models are currently live on OpenRouter and are
// capable of the request being made (this project always sends
// `tools`, and the router is documented to filter for models that
// support what's requested). Chosen over hard-coding one specific
// `:free` model id because OpenRouter's free lineup churns constantly
// — individual free models get added/pulled/repriced from week to
// week, while `openrouter/free` itself stays a stable, always-free
// entry point. Overridable via env to pin a specific `:free` model
// instead, WITHOUT touching code — but see isFreeModelId below, which
// refuses to run at all if this ever points at a paid model.
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
export const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions";
// Purely cosmetic — shows up in OpenRouter's own request logs/rankings
// for this app, never sent anywhere else, contains no secret.
export const OPENROUTER_APP_TITLE = "TradeHub Shopping Assistant";
export const MAX_OUTPUT_TOKENS = 1024;

// Keeps a runaway/looping tool-use conversation from calling the
// OpenRouter API indefinitely server-side — one search-then-answer
// round trip is the expected shape; a couple of extra rounds is a
// reasonable ceiling, not evidence something's gone wrong.
export const MAX_TOOL_ROUNDS = 4;

// ============================================================
// Hard "never pay" guard. This project must NEVER call a paid model,
// even by accident (e.g. someone pastes a paid model id into
// OPENROUTER_MODEL locally, or a future OpenRouter free-model rename
// silently drops the `:free` suffix convention). route.ts checks this
// BEFORE making any upstream request and refuses to proceed — loudly,
// to the user, not by silently substituting a different model — if it
// ever fails.
// ============================================================
export function isFreeModelId(modelId: string): boolean {
  return modelId === "openrouter/free" || modelId.endsWith(":free");
}

export const NON_FREE_MODEL_ERROR =
  "The configured OPENROUTER_MODEL is not a free model. Refusing to make a request that could incur cost — this project only ever calls OpenRouter's free tier.";

export const SYSTEM_PROMPT = `You are ShopMate, the shopping assistant built into this e-commerce marketplace. You help shoppers on THIS site — not a general-purpose chatbot.

Your job:
- Understand what the shopper needs: product type, budget, use case, and preferences.
- Ask a short, useful follow-up question when you're missing something important (budget, use case, quantity) instead of guessing.
- When you have enough to search, use the search_products tool against the real catalog. Never invent products, prices, brands, or specs that aren't in a tool result.
- Recommend from what search_products actually returns. If nothing matches, say so plainly and suggest how the shopper could broaden the search (different category, higher budget, etc.) rather than inventing an item.
- Clearly separate PRODUCT FACTS (only from tool results — name, price, rating, brand, condition) from your own GENERAL ADVICE or opinion (e.g. "for gaming, over-ear headphones usually isolate sound better") — don't state advice as if it were a catalog fact.
- Be concise. This is a chat panel next to a shopping site, not an essay. A short paragraph or a tight list beats a long one.
- Stay on topic: helping the shopper find and decide on products from this catalog. If asked something unrelated to shopping on this site, say that's outside what you can help with here and steer back.

Available categories: ${Object.entries(CATEGORY_LABELS)
  .map(([key, label]) => `${key} (${label})`)
  .join(", ")}.`;

// ============================================================
// The one tool ShopMate can call — a thin wrapper around this
// project's OWN filterProducts(), not a second/fake catalog. OpenAI-
// style function-calling schema (OpenRouter's tool-calling format),
// same JSON Schema `parameters` shape Anthropic used under
// `input_schema` — only the wrapping envelope (`type`/`function`)
// differs.
// ============================================================
export const SEARCH_PRODUCTS_TOOL = {
  type: "function" as const,
  function: {
    name: "search_products",
    description:
      "Search this marketplace's real product catalog. Use this before recommending any specific product, price, or brand — never state product facts you haven't gotten from this tool.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Free-text search matched against product name, description, and brand (e.g. 'headphones').",
        },
        category: {
          type: "string",
          enum: Object.keys(CATEGORY_LABELS),
          description: "Restrict to one catalog category, if the shopper's request clearly maps to one.",
        },
        maxPrice: { type: "number", description: "Upper price bound in USD, if the shopper gave a budget." },
        minPrice: { type: "number", description: "Lower price bound in USD, if relevant." },
        minRating: { type: "number", description: "Minimum star rating (1-5), if the shopper cares about rating." },
        sort: {
          type: "string",
          enum: ["default", "price-asc", "price-desc", "rating", "trending"],
          description: "How to order results — default is best-match popularity.",
        },
      },
    },
  },
};

export interface ToolProductResult {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  rating: number;
  brand: string;
  category: string;
  condition: string;
}

// Capped and shaped down from the full Product record — the model
// only needs enough to describe and recommend, not every spec/gallery
// field, and a tighter payload keeps the tool round trip fast.
export function executeSearchProducts(input: Record<string, unknown>): { results: ToolProductResult[]; count: number } {
  const filters: ListingFilters = {
    q: typeof input.query === "string" ? input.query : undefined,
    category: typeof input.category === "string" ? (input.category as CategoryKey) : undefined,
    maxPrice: typeof input.maxPrice === "number" ? input.maxPrice : undefined,
    minPrice: typeof input.minPrice === "number" ? input.minPrice : undefined,
    minRating: typeof input.minRating === "number" ? input.minRating : undefined,
    sort:
      typeof input.sort === "string" && ["default", "price-asc", "price-desc", "rating", "trending"].includes(input.sort)
        ? (input.sort as ListingFilters["sort"])
        : undefined,
  };

  const matches = filterProducts(filters).slice(0, 8);
  return {
    count: matches.length,
    results: matches.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      oldPrice: p.oldPrice,
      rating: p.rating,
      brand: p.brand,
      category: p.category,
      condition: p.condition,
    })),
  };
}
