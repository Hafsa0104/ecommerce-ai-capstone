// ============================================================
// lib/ai.test.ts — unit tests for the two pure, non-network parts
// of ShopMate's AI integration:
//   - isFreeModelId(): the runtime guard that stops the app from
//     ever calling a paid OpenRouter model.
//   - executeSearchProducts(): the search_products tool
//     implementation the model calls mid-conversation — proves it
//     is wired to the REAL catalog (services/productData.ts), not a
//     second/fake data source, and that it never returns more than
//     the capped 8 results regardless of how broad the query is.
// Deliberately does NOT touch app/api/assistant/route.ts itself —
// that file makes real network calls to OpenRouter and streams a
// Response, which is integration behavior exercised by hand against
// the live API (see README.md's Testing section), not something to
// fake through a mocked fetch here.
// ============================================================
import { describe, expect, it } from "vitest";
import { isFreeModelId, executeSearchProducts } from "./ai";
import { PRODUCTS } from "@/services/productData";

describe("isFreeModelId", () => {
  it("accepts the default free-tier router id", () => {
    expect(isFreeModelId("openrouter/free")).toBe(true);
  });

  it("accepts any model id ending in :free", () => {
    expect(isFreeModelId("meta-llama/llama-3.1-8b-instruct:free")).toBe(true);
  });

  it("rejects a paid model id", () => {
    expect(isFreeModelId("openai/gpt-4o")).toBe(false);
  });

  it("rejects a model id that merely contains 'free' without the :free suffix", () => {
    expect(isFreeModelId("freeform/not-actually-free-model")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isFreeModelId("")).toBe(false);
  });
});

describe("executeSearchProducts", () => {
  it("returns real catalog products, not fabricated ones", () => {
    const { results } = executeSearchProducts({ query: "wheel" });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const real = PRODUCTS.find((p) => p.id === r.id);
      expect(real).toBeDefined();
      expect(real!.name).toBe(r.name);
      expect(real!.price).toBe(r.price);
    }
  });

  it("caps results at 8 even for a query matching many products", () => {
    // No filters at all matches the entire catalog, which is
    // comfortably more than 8 products.
    const { results, count } = executeSearchProducts({});
    expect(results.length).toBeLessThanOrEqual(8);
    expect(count).toBeLessThanOrEqual(8);
  });

  it("respects a maxPrice budget constraint", () => {
    const { results } = executeSearchProducts({ maxPrice: 20 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.price <= 20)).toBe(true);
  });

  it("returns an empty result set for a query nothing matches, rather than inventing a product", () => {
    const { results, count } = executeSearchProducts({ query: "zzz-nonexistent-zzz" });
    expect(results).toHaveLength(0);
    expect(count).toBe(0);
  });

  it("ignores malformed/unexpected input types instead of throwing", () => {
    expect(() =>
      executeSearchProducts({ query: 12345, maxPrice: "cheap", category: {}, sort: "not-a-real-sort" })
    ).not.toThrow();
  });
});
