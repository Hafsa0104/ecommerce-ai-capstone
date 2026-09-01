// ============================================================
// services/productService.test.ts — unit tests for the listing
// page's search/filter/sort/pagination logic. This is the single
// implementation shared by:
//   - the listing page's URL-driven filters (app/listing/page.tsx)
//   - ShopMate's search_products tool (lib/ai.ts's
//     executeSearchProducts, tested separately in lib/ai.test.ts)
// so a regression here would break both the storefront and the AI
// assistant's product grounding at once. Runs against the REAL
// catalog in productData.ts — no mocked/fake product data.
// ============================================================
import { describe, expect, it } from "vitest";
import { filterProducts, paginate, isDealProduct } from "./productService";
import { PRODUCTS } from "./productData";

describe("filterProducts", () => {
  it("returns the full catalog with no filters", () => {
    expect(filterProducts({})).toHaveLength(PRODUCTS.length);
  });

  it("filters by category", () => {
    const results = filterProducts({ category: "automobiles" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.category === "automobiles")).toBe(true);
  });

  it("filters by brand, case-insensitively", () => {
    const results = filterProducts({ brand: "rimcraft" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.brand.toLowerCase() === "rimcraft")).toBe(true);
  });

  it("token-matches a multi-word query across name, description, and brand", () => {
    // "RimCraft" is a brand; "Wheel" only appears in a product name.
    // Neither field alone contains the full phrase "rimcraft wheel" —
    // this is exactly the case the token-based search exists for.
    const results = filterProducts({ q: "rimcraft wheel" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.brand === "RimCraft" && /wheel/i.test(p.name))).toBe(true);
  });

  it("returns no results for a query nothing in the catalog matches", () => {
    const results = filterProducts({ q: "zzz-nonexistent-product-zzz" });
    expect(results).toHaveLength(0);
  });

  it("respects a minPrice/maxPrice budget range", () => {
    const results = filterProducts({ minPrice: 10, maxPrice: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.price >= 10 && p.price <= 50)).toBe(true);
  });

  it("filters to deals-only using the same isDealProduct rule the UI uses", () => {
    const results = filterProducts({ dealsOnly: true });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(isDealProduct)).toBe(true);
  });

  it("filters to verified-only suppliers", () => {
    const results = filterProducts({ verifiedOnly: true });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.verified)).toBe(true);
  });

  it("filters by a minimum rating", () => {
    const results = filterProducts({ minRating: 4 });
    expect(results.every((p) => p.rating >= 4)).toBe(true);
  });

  it("sorts by price ascending", () => {
    const results = filterProducts({ sort: "price-asc" });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeGreaterThanOrEqual(results[i - 1].price);
    }
  });

  it("sorts by price descending", () => {
    const results = filterProducts({ sort: "price-desc" });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].price).toBeLessThanOrEqual(results[i - 1].price);
    }
  });

  it("sorts by rating", () => {
    const results = filterProducts({ sort: "rating" });
    for (let i = 1; i < results.length; i++) {
      expect(results[i].rating).toBeLessThanOrEqual(results[i - 1].rating);
    }
  });

  it("combines multiple filters (category + budget + verified)", () => {
    const results = filterProducts({ category: "automobiles", maxPrice: 100, verifiedOnly: true });
    expect(results.every((p) => p.category === "automobiles" && p.price <= 100 && p.verified)).toBe(true);
  });
});

describe("paginate", () => {
  it("splits results into pages of the given size", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const page1 = paginate(items, 1, 10);
    expect(page1.items).toHaveLength(10);
    expect(page1.totalPages).toBe(3);
    expect(page1.total).toBe(25);
  });

  it("clamps a page number below 1 up to page 1", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, -5, 10).page).toBe(1);
  });

  it("clamps a page number past the end down to the last page", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(paginate(items, 99, 10).page).toBe(3);
  });

  it("returns exactly one page (page 1) for an empty result set", () => {
    const result = paginate([], 1, 10);
    expect(result.items).toHaveLength(0);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });
});
