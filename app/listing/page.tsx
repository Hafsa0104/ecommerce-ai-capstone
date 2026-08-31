import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";
import ActiveFilterChips from "@/components/ActiveFilterChips";
import MobileFilterDrawer from "@/components/MobileFilterDrawer";
import Pagination from "@/components/Pagination";
import { CATEGORY_LABELS } from "@/services/productData";
import {
  filterProducts,
  paginate,
  buildFilterHref,
  getTrendingProductIds,
  getAllBrands,
  LISTING_PAGE_SIZE,
  type ListingFilters,
  type SortOption,
} from "@/services/productService";
import type { CategoryKey, ProductCondition } from "@/types/product";
import styles from "./page.module.css";

// This page reads `searchParams` (category/search/sort/filters), which
// makes Next.js render it dynamically per request rather than caching
// it via ISR — a `revalidate` export here would have no effect. That's
// the correct trade-off: filtered results depend on the query string,
// so SSR (fresh HTML per request, still fully crawlable) is right here,
// while the Home and Product pages use ISR since their content doesn't
// depend on per-request input.

interface ListingSearchParams {
  category?: string;
  q?: string;
  brand?: string;
  condition?: string;
  minRating?: string;
  verified?: string;
  deals?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  page?: string;
}

const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));
const VALID_CONDITIONS = new Set<ProductCondition>(["brand-new", "refurbished", "old"]);
const VALID_SORTS = new Set<SortOption>(["default", "price-asc", "price-desc", "rating", "trending"]);
// Lowercased for a case-insensitive check against the URL param —
// filterProducts itself already compares case-insensitively, so
// validation here just needs to agree on what counts as a real brand.
const VALID_BRANDS = new Set(getAllBrands().map((b) => b.toLowerCase()));

// `Number("garbage")` is NaN, not an error — and NaN is neither null nor
// undefined, so a naive `!= null` check (as minPrice/maxPrice used to
// use) lets it straight through into `price >= NaN`, which is false for
// every product. A malformed URL param would silently zero out the
// results instead of just being ignored like an invalid category/sort
// already is. This keeps every numeric filter failing safely the same way.
function toFiniteNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

const ALL_BRANDS = getAllBrands();

function parseFilters(sp: ListingSearchParams) {
  const category =
    sp.category && VALID_CATEGORIES.has(sp.category) ? (sp.category as CategoryKey) : undefined;
  // Re-cased to the catalog's own canonical spelling ("Apple", not
  // "apple") regardless of how it arrived in the URL — a manually
  // typed/lowercased link still works, and the display label is always
  // right either way.
  const brandParam = sp.brand?.trim().toLowerCase();
  const brand = brandParam && VALID_BRANDS.has(brandParam) ? ALL_BRANDS.find((b) => b.toLowerCase() === brandParam) : undefined;
  const condition =
    sp.condition && VALID_CONDITIONS.has(sp.condition as ProductCondition)
      ? (sp.condition as ProductCondition)
      : undefined;
  const sort = sp.sort && VALID_SORTS.has(sp.sort as SortOption) ? (sp.sort as SortOption) : "default";
  const minRating = toFiniteNumber(sp.minRating);
  const minPrice = toFiniteNumber(sp.minPrice);
  const maxPrice = toFiniteNumber(sp.maxPrice);
  const verifiedOnly = sp.verified === "1";
  const dealsOnly = sp.deals === "1";
  const page = Math.max(1, toFiniteNumber(sp.page) ?? 1);
  const q = sp.q?.trim() || undefined;

  return { category, q, brand, condition, minRating, minPrice, maxPrice, sort, verifiedOnly, dealsOnly, page };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const { category, q, brand, dealsOnly } = parseFilters(sp);

  let title = "All products";
  if (q) title = `Search results for "${q}"`;
  else if (category) title = CATEGORY_LABELS[category];
  else if (brand) title = brand;
  else if (dealsOnly) title = "Deals and offers";

  const description = category
    ? `Browse ${CATEGORY_LABELS[category]} from verified wholesale suppliers on TradeHub.`
    : brand
      ? `Browse ${brand} products from verified wholesale suppliers on TradeHub.`
      : dealsOnly
        ? "Hand-picked discounts from verified wholesale suppliers on TradeHub."
        : "Browse and filter products from verified wholesale suppliers on TradeHub.";

  const canonical = category
    ? `/listing?category=${category}`
    : brand
      ? `/listing?brand=${encodeURIComponent(brand)}`
      : dealsOnly
        ? "/listing?deals=1"
        : "/listing";

  return {
    title,
    description,
    alternates: { canonical },
    // Filtered/search result pages are near-duplicates of the base listing —
    // index the canonical, don't index every filter combination.
    robots: category || q || brand || dealsOnly ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function ListingPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  let filtered = filterProducts(filters);

  // A leftover search term combined with a newly-picked category/
  // condition/rating/price filter often ANDs down to zero results —
  // the search text was relevant to the PREVIOUS view, not necessarily
  // to whatever the shopper just clicked. Rather than a dead end, fall
  // back to dropping just the search text and show that filter's
  // results instead, with a clear notice explaining what happened (the
  // "Search" chip stays in ActiveFilterChips, still one click to
  // remove or to go back to the literal search). Only kicks in when
  // there's something else to fall back TO — a search with no other
  // filters that matches nothing is a genuinely empty search, not this
  // case.
  const hasOtherFilters = Boolean(
    filters.category ||
      filters.brand ||
      filters.condition ||
      filters.minRating ||
      filters.verifiedOnly ||
      filters.dealsOnly ||
      filters.minPrice != null ||
      filters.maxPrice != null
  );
  let searchFallbackApplied = false;
  if (filtered.length === 0 && filters.q && hasOtherFilters) {
    const withoutSearch = filterProducts({ ...filters, q: undefined });
    if (withoutSearch.length > 0) {
      filtered = withoutSearch;
      searchFallbackApplied = true;
    }
  }

  const { items, page, totalPages, total } = paginate(filtered, filters.page, LISTING_PAGE_SIZE);
  const trendingIds = getTrendingProductIds();

  const scopeHeading = filters.category
    ? CATEGORY_LABELS[filters.category]
    : filters.brand
      ? filters.brand
      : filters.dealsOnly
        ? "Deals and offers"
        : "All products";
  const heading = searchFallbackApplied
    ? scopeHeading
    : filters.q
      ? `Search results for "${filters.q}"`
      : scopeHeading;

  const active: ListingFilters = filters;
  const activeFilterCount = [
    active.category,
    active.brand,
    active.condition,
    active.minRating,
    active.verifiedOnly,
    active.dealsOnly,
    active.minPrice != null,
    active.maxPrice != null,
  ].filter(Boolean).length;

  return (
    <div className={`wrap ${styles.pageContainer}`}>
      <h1 className={styles.pageHeading}>{heading}</h1>

      <div className={styles.layout}>
        <div className={styles.desktopSidebar}>
          <FilterSidebar active={active} />
        </div>

        <div className={styles.main}>
          <div className={styles.topbar}>
            <p className={styles.resultsCount}>
              <strong>{total}</strong> {total === 1 ? "item" : "items"}
            </p>

            <div className={styles.topbarRight}>
              <MobileFilterDrawer activeCount={activeFilterCount}>
                <FilterSidebar active={active} idPrefix="mobile-" variant="plain" />
              </MobileFilterDrawer>

              <Link
                href={buildFilterHref(active, { verifiedOnly: !active.verifiedOnly })}
                className={`${styles.verifiedToggle} ${active.verifiedOnly ? styles.verifiedToggleOn : ""}`}
                aria-pressed={active.verifiedOnly}
              >
                Verified only
              </Link>

              <Link
                href={buildFilterHref(active, { dealsOnly: !active.dealsOnly })}
                className={`${styles.verifiedToggle} ${active.dealsOnly ? styles.verifiedToggleOn : ""}`}
                aria-pressed={active.dealsOnly}
              >
                Deals only
              </Link>

              <form action="/listing" method="get" className={styles.sortForm}>
                {active.category && <input type="hidden" name="category" value={active.category} />}
                {active.q && <input type="hidden" name="q" value={active.q} />}
                {active.brand && <input type="hidden" name="brand" value={active.brand} />}
                {active.condition && <input type="hidden" name="condition" value={active.condition} />}
                {active.minRating && <input type="hidden" name="minRating" value={active.minRating} />}
                {active.verifiedOnly && <input type="hidden" name="verified" value="1" />}
                {active.dealsOnly && <input type="hidden" name="deals" value="1" />}
                {active.minPrice != null && <input type="hidden" name="minPrice" value={active.minPrice} />}
                {active.maxPrice != null && <input type="hidden" name="maxPrice" value={active.maxPrice} />}

                <label htmlFor="sortSelect" className={styles.sortLabel}>
                  Sort by
                </label>
                <select id="sortSelect" name="sort" defaultValue={active.sort} className={styles.sortSelect}>
                  <option value="default">Best match</option>
                  <option value="trending">Trending</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Top rated</option>
                </select>
                <button type="submit" className={styles.sortApply}>
                  Apply
                </button>
              </form>
            </div>
          </div>

          <ActiveFilterChips active={active} />

          {searchFallbackApplied && (
            <p className={styles.searchFallbackNotice} role="status">
              No products matched &ldquo;{filters.q}&rdquo;.
            </p>
          )}

          {items.length === 0 ? (
            <div className={styles.emptyState} role="status">
              <p>No products match these filters.</p>
              <Link href="/listing">Clear all filters</Link>
            </div>
          ) : (
            <div className={styles.productGrid}>
              {items.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={i === 0}
                  isTrending={trendingIds.has(product.id)}
                />
              ))}
            </div>
          )}

          <Pagination active={active} page={page} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}
