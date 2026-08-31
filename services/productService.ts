// ============================================================
// services/productService.ts — pure product logic (no DOM, no
// React) so it can run on both server and client components.
// ============================================================
import type {
  Product,
  ProductSpecs,
  PriceTier,
  Review,
  Supplier,
  ShipCountry,
  CategoryKey,
  ProductCondition,
} from "@/types/product";
import {
  PRODUCTS,
  CATEGORY_SPEC_DEFAULTS,
  REVIEW_TEMPLATES,
  SUPPLIER_POOL,
} from "./productData";

export function getProductById(id: string): Product | null {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

export function getAllProducts(): Product[] {
  return PRODUCTS;
}

export function getProductsByCategory(category: string): Product[] {
  return PRODUCTS.filter((p) => p.category === category);
}

/** Every distinct brand actually present in the catalog, alphabetical
 * — the source of truth for FilterSidebar's Brand section, so that
 * list can never drift out of sync with what's really stocked (no
 * separately-maintained brand list to go stale). */
export function getAllBrands(): string[] {
  return Array.from(new Set(PRODUCTS.map((p) => p.brand))).sort((a, b) => a.localeCompare(b));
}

/** Brands that actually carry at least one product in the given
 * category — lets FilterSidebar disable the brand links that would
 * otherwise lead to a guaranteed zero-result combination, instead of
 * letting the shopper click into a dead end and only finding out
 * afterward. */
export function getBrandsInCategory(category: CategoryKey): Set<string> {
  return new Set(PRODUCTS.filter((p) => p.category === category).map((p) => p.brand));
}

/**
 * A handful of representative products for a category — used by the
 * navbar's category mega menu to preview what's inside before the
 * shopper commits to opening the full listing. Same "most-ordered"
 * definition as Trending, scoped to one category.
 */
export function getCategoryPreview(category: CategoryKey, limit = 4): Product[] {
  return PRODUCTS.filter((p) => p.category === category)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, limit);
}

/** The one existing definition of a "deal" (used by the Deals-only
 * filter, and reused here so a product card can flag itself as a deal
 * without redefining the rule). */
export function isDealProduct(product: Product): boolean {
  return Boolean(product.hot) || product.oldPrice != null;
}

/**
 * "$" + thousands separators + exactly 2 decimals — every price on this
 * site otherwise uses a bare `.toFixed(2)`, which is fine for a single
 * unit price but unreadable once a bulk-order quantity pushes a
 * subtotal into 6+ digits (e.g. "$1915023.00" vs "$1,915,023.00").
 * Scoped to ProductPurchasePanel's Subtotal line for now, not applied
 * to every price on the site — the small per-item prices elsewhere
 * don't have this readability problem.
 */
export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Same "most-ordered" precedent already established for Trending (the
 * sort option below) and the Home page's own "Trending now" section,
 * which uses this exact comparator with the same top-10 cutoff — applied
 * per-product instead of as a sort order, so a listing-page card can
 * flag itself as trending. Not a new scoring system, just this existing
 * definition read a different way.
 */
export function getTrendingProductIds(limit = 10): Set<string> {
  return new Set(
    [...PRODUCTS]
      .sort((a, b) => b.orders - a.orders)
      .slice(0, limit)
      .map((p) => p.id)
  );
}

export function getSpecs(product: Product): ProductSpecs {
  const d = CATEGORY_SPEC_DEFAULTS[product.category] ?? CATEGORY_SPEC_DEFAULTS["computer-and-tech"];
  const s = product.specs ?? {};
  return {
    type: s.type ?? d.type,
    material: s.material ?? d.material,
    design: s.design ?? d.design,
    customization: s.customization ?? d.customization,
    protection: s.protection ?? d.protection,
    warranty: s.warranty ?? d.warranty,
  };
}

export function getPriceTiers(product: Product): PriceTier[] {
  if (product.priceTiers?.length) return product.priceTiers;
  const base = product.price;
  return [
    { label: "1-49 pcs", qtyFrom: 1, qtyTo: 49, price: +base.toFixed(2) },
    { label: "50-100 pcs", qtyFrom: 50, qtyTo: 100, price: +(base * 0.92).toFixed(2) },
    { label: "100+ pcs", qtyFrom: 101, qtyTo: null, price: +(base * 0.8).toFixed(2) },
  ];
}

export function getReviewCount(product: Product): number {
  return product.reviewCount ?? Math.max(5, Math.round((product.orders || 10) * 0.35));
}

export function getReviews(product: Product): Review[] {
  if (product.reviews?.length) return product.reviews;
  const r = Math.max(1, Math.min(5, product.rating || 4));
  const pool = REVIEW_TEMPLATES[r] ?? REVIEW_TEMPLATES[4];
  return pool.map((text) => ({ stars: r, text }));
}

export function getGallery(product: Product): string[] {
  if (product.gallery?.length) return product.gallery;
  const sameCat = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).map(
    (p) => p.img
  );
  return Array.from(new Set([product.img, ...sameCat])).slice(0, 5);
}

export function getRelatedProducts(product: Product, limit = 6): Product[] {
  const sameCat = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id);
  const result = [...sameCat];
  if (result.length < limit) {
    const others = PRODUCTS.filter((p) => p.category !== product.category).sort(
      (a, b) => (b.orders || 0) - (a.orders || 0)
    );
    for (const p of others) {
      if (result.length >= limit) break;
      if (!result.find((r) => r.id === p.id)) result.push(p);
    }
  }
  return result.slice(0, limit);
}

/**
 * Content-based recommendation engine — this is the site's AI
 * feature. It scores every other product against the one being
 * viewed using shared category, brand, overlapping features, and
 * rating, the same pattern used in the movie app's recommendation
 * service. No external API call needed; it's a real, explainable
 * scoring model over product metadata.
 */
export function getRecommendations(product: Product, limit = 5): Product[] {
  const pool = PRODUCTS.filter((p) => p.id !== product.id);
  const scored = pool.map((p) => {
    let score = 0;
    if (p.category === product.category) score += 2;
    if (p.brand && product.brand && p.brand === product.brand) score += 3;
    const overlap = (p.features || []).filter((f) => (product.features || []).includes(f)).length;
    score += overlap;
    score += Math.min(2, (p.rating || 0) / 3);
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.p);
}

/** Deterministic string hash — same input always gives the same output,
 * so anything derived from it (supplier selection below, a review's
 * seed "helpful" count in ReviewCard) stays identical between server
 * and client render and across reloads, unlike Math.random(). */
export function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getSupplierForProduct(product: Product, shipCountry: ShipCountry): Supplier {
  const pool = SUPPLIER_POOL[shipCountry] ?? SUPPLIER_POOL["Germany"];
  const idx = hashStr(product.id + "|" + shipCountry) % pool.length;
  return pool[idx];
}

// ============================================================
// Listing / search / filter — pure, so it renders fully on the
// server (crawlable HTML, no empty client-rendered shell).
// ============================================================

export type SortOption = "default" | "price-asc" | "price-desc" | "rating" | "trending";

export interface ListingFilters {
  category?: CategoryKey;
  q?: string;
  brand?: string;
  condition?: ProductCondition;
  minRating?: number;
  verifiedOnly?: boolean;
  dealsOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
}

export function filterProducts(filters: ListingFilters): Product[] {
  let results = PRODUCTS;

  if (filters.category) {
    results = results.filter((p) => p.category === filters.category);
  }
  if (filters.brand) {
    results = results.filter((p) => p.brand.toLowerCase() === filters.brand!.toLowerCase());
  }
  if (filters.dealsOnly) {
    results = results.filter(isDealProduct);
  }
  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    if (q) {
      // Token-based, not one whole-string substring check: a query
      // like "Lenovo laptop" has no single field containing that exact
      // phrase (the brand is "Lenovo", the product name is "Laptops"),
      // but a shopper typing brand + product together is completely
      // normal — the placeholder itself promises "products, brands and
      // more". Splitting into words and requiring each one to appear
      // SOMEWHERE across name/desc/brand (matched against the combined
      // text, so different words can each land in a different field)
      // is what makes that search actually find the product, while a
      // single-word query still behaves exactly as before.
      const tokens = q.split(/\s+/).filter(Boolean);
      results = results.filter((p) => {
        const haystack = `${p.name} ${p.desc} ${p.brand}`.toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      });
    }
  }
  if (filters.condition) {
    results = results.filter((p) => p.condition === filters.condition);
  }
  if (filters.minRating) {
    results = results.filter((p) => p.rating >= filters.minRating!);
  }
  if (filters.verifiedOnly) {
    results = results.filter((p) => p.verified);
  }
  if (filters.minPrice != null) {
    results = results.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice != null) {
    results = results.filter((p) => p.price <= filters.maxPrice!);
  }

  const sorted = [...results];
  switch (filters.sort) {
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case "trending":
      // Same "most-ordered" definition the Home page's Trending section uses.
      sorted.sort((a, b) => b.orders - a.orders);
      break;
    default:
      // "Best match" — popularity proxy using order volume, hot items first.
      sorted.sort((a, b) => Number(!!b.hot) - Number(!!a.hot) || b.orders - a.orders);
  }
  return sorted;
}

export const LISTING_PAGE_SIZE = 12;

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

export function paginate<T>(items: T[], page: number, pageSize = LISTING_PAGE_SIZE): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: safePage, totalPages, total: items.length };
}

// ============================================================
// Listing URL building — one shared implementation instead of the
// near-identical query-string builders that used to live separately in
// FilterSidebar.tsx and app/listing/page.tsx. Every listing control
// (sidebar links, top-bar toggles, sort form, pagination, filter chips)
// goes through one of these two so the query-param names can't drift.
// ============================================================

function serializeListingParams(filters: ListingFilters, page?: number): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.minRating) params.set("minRating", String(filters.minRating));
  if (filters.verifiedOnly) params.set("verified", "1");
  if (filters.dealsOnly) params.set("deals", "1");
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.sort && filters.sort !== "default") params.set("sort", filters.sort);
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/listing?${qs}` : "/listing";
}

/**
 * URL for a *filter* change (category/condition/rating/price/verified/
 * deals/sort/clear). Deliberately has no `page` parameter to preserve —
 * changing what's filtered can invalidate whatever page the user was on,
 * so every filter change always lands back on page 1.
 */
export function buildFilterHref(active: ListingFilters, overrides: Partial<ListingFilters>): string {
  return serializeListingParams({ ...active, ...overrides });
}

/**
 * URL for a *page-number* change only — keeps every current filter
 * exactly as-is and sets just the page.
 */
export function buildPageHref(active: ListingFilters, page: number): string {
  return serializeListingParams(active, page);
}
