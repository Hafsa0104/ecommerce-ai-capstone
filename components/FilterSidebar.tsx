// components/FilterSidebar.tsx — server component. Every control is
// a real <Link> or a native GET <form>, so filtering works with zero
// client-side JS and stays fully crawlable/bookmarkable via the URL.
import Link from "next/link";
import { CATEGORY_LABELS } from "@/services/productData";
import { buildFilterHref, getAllBrands, getBrandsInCategory, type ListingFilters } from "@/services/productService";
import type { CategoryKey, ProductCondition } from "@/types/product";
import styles from "./FilterSidebar.module.css";

const CATEGORY_ENTRIES = Object.entries(CATEGORY_LABELS) as [CategoryKey, string][];
const ALL_BRANDS = getAllBrands();

const CONDITIONS: { value: ProductCondition; label: string }[] = [
  { value: "brand-new", label: "Brand new" },
  { value: "refurbished", label: "Refurbished" },
  { value: "old", label: "Old items" },
];

const RATINGS = [4, 3, 2, 1];

// Filled = r + 1 out of 5 (so "4+" reads as 5 filled stars, "3+" as 4,
// and so on) — matches the exact glyph pattern requested, not a literal
// star-rating readout of the threshold itself.
function renderStars(minRating: number): string {
  const filled = minRating + 1;
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

interface FilterSidebarProps {
  active: ListingFilters;
  // Set only when this same sidebar is rendered a second time on the
  // page (the mobile drawer renders one copy alongside the desktop
  // aside's copy, each hidden at the other's breakpoint via CSS) — the
  // two price inputs' ids would otherwise collide, which is invalid
  // HTML and breaks their label association.
  idPrefix?: string;
  // "card" (default) is the standalone desktop look — its own border/
  // background/padding. "plain" drops that chrome for the mobile drawer,
  // which already supplies its own sheet framing; without this, the
  // sidebar rendered inside it looks like a card pasted into a dialog
  // rather than the dialog's own content.
  variant?: "card" | "plain";
}

export default function FilterSidebar({ active, idPrefix = "", variant = "card" }: FilterSidebarProps) {
  // null = no category picked, so every brand is fair game. Once a
  // category IS picked, this is the real set of brands that actually
  // have something in it — anything outside it would be a guaranteed
  // zero-result click, so those get disabled below instead.
  const brandsInCategory = active.category ? getBrandsInCategory(active.category) : null;

  const hasAnyFilter =
    active.category ||
    active.brand ||
    active.condition ||
    active.minRating ||
    active.verifiedOnly ||
    active.dealsOnly ||
    active.minPrice != null ||
    active.maxPrice != null;

  return (
    <aside
      className={`${styles.sidebar} ${variant === "plain" ? styles.sidebarPlain : ""}`}
      aria-label="Filter products"
    >
      {hasAnyFilter && (
        <Link href={active.q ? `/listing?q=${encodeURIComponent(active.q)}` : "/listing"} className={styles.clearAll}>
          Clear all filters
        </Link>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Category</h2>
        <ul className={styles.list}>
          <li>
            <Link
              href={buildFilterHref(active, { category: undefined })}
              className={!active.category ? styles.activeLink : undefined}
              aria-current={!active.category ? "true" : undefined}
            >
              All categories
            </Link>
          </li>
          {CATEGORY_ENTRIES.map(([key, label]) => (
            <li key={key}>
              <Link
                href={buildFilterHref(active, { category: key })}
                className={active.category === key ? styles.activeLink : undefined}
                aria-current={active.category === key ? "true" : undefined}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.divider} />

      {/* Every brand actually carried in the catalog (see getAllBrands),
          not a hand-maintained list — the whole point is so a shopper
          can see AND filter by which real brands this store stocks,
          not just guess from typing one into search. Scrollable rather
          than always showing all ~40 at once, same "cap the height,
          don't cap the count" shape the recent-searches list already
          uses. */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Brand</h2>
        <ul className={`${styles.list} ${styles.brandList}`}>
          <li>
            <Link
              href={buildFilterHref(active, { brand: undefined })}
              className={!active.brand ? styles.activeLink : undefined}
              aria-current={!active.brand ? "true" : undefined}
            >
              All brands
            </Link>
          </li>
          {ALL_BRANDS.map((brand) => {
            // Only ever restricts, never hides "All brands" or the
            // currently-active category's own real brands — a category
            // with zero products left disables every brand automatically
            // (an empty set), which is correct: nothing in it to filter by.
            const disabled = brandsInCategory !== null && !brandsInCategory.has(brand);
            if (disabled) {
              return (
                <li key={brand}>
                  <span
                    className={styles.disabledOption}
                    aria-disabled="true"
                    title={`No ${brand} products in ${active.category ? CATEGORY_LABELS[active.category] : "this category"}`}
                  >
                    {brand}
                  </span>
                </li>
              );
            }
            return (
              <li key={brand}>
                <Link
                  href={buildFilterHref(active, { brand })}
                  className={active.brand === brand ? styles.activeLink : undefined}
                  aria-current={active.brand === brand ? "true" : undefined}
                >
                  {brand}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Condition</h2>
        <ul className={styles.list}>
          <li>
            <Link
              href={buildFilterHref(active, { condition: undefined })}
              className={!active.condition ? styles.activeLink : undefined}
              aria-current={!active.condition ? "true" : undefined}
            >
              Any
            </Link>
          </li>
          {CONDITIONS.map((c) => (
            <li key={c.value}>
              <Link
                href={buildFilterHref(active, { condition: c.value })}
                className={active.condition === c.value ? styles.activeLink : undefined}
                aria-current={active.condition === c.value ? "true" : undefined}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Minimum rating</h2>
        <ul className={styles.list}>
          <li>
            <Link
              href={buildFilterHref(active, { minRating: undefined })}
              className={!active.minRating ? styles.activeLink : undefined}
              aria-current={!active.minRating ? "true" : undefined}
            >
              Any rating
            </Link>
          </li>
          {RATINGS.map((r) => (
            <li key={r}>
              <Link
                href={buildFilterHref(active, { minRating: r })}
                className={active.minRating === r ? styles.activeLink : undefined}
                aria-current={active.minRating === r ? "true" : undefined}
              >
                <span aria-hidden="true" className={styles.stars}>
                  {renderStars(r)}
                </span>
                {r}+<span className="sr-only"> stars and up</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Price range</h2>
        {/* Native GET form — works with JS fully disabled. */}
        <form className={styles.priceForm} action="/listing" method="get">
          {active.category && <input type="hidden" name="category" value={active.category} />}
          {active.q && <input type="hidden" name="q" value={active.q} />}
          {active.brand && <input type="hidden" name="brand" value={active.brand} />}
          {active.condition && <input type="hidden" name="condition" value={active.condition} />}
          {active.minRating && <input type="hidden" name="minRating" value={active.minRating} />}
          {active.verifiedOnly && <input type="hidden" name="verified" value="1" />}
          {active.dealsOnly && <input type="hidden" name="deals" value="1" />}
          {active.sort && active.sort !== "default" && <input type="hidden" name="sort" value={active.sort} />}

          <label htmlFor={`${idPrefix}minPrice`} className="sr-only">
            Minimum price
          </label>
          <input
            id={`${idPrefix}minPrice`}
            type="number"
            name="minPrice"
            min={0}
            placeholder="Min"
            defaultValue={active.minPrice ?? ""}
            className={styles.priceInput}
          />
          <span aria-hidden="true">–</span>
          <label htmlFor={`${idPrefix}maxPrice`} className="sr-only">
            Maximum price
          </label>
          <input
            id={`${idPrefix}maxPrice`}
            type="number"
            name="maxPrice"
            min={0}
            placeholder="Max"
            defaultValue={active.maxPrice ?? ""}
            className={styles.priceInput}
          />
          <button type="submit" className={styles.priceApply}>
            Apply
          </button>
        </form>
      </div>
    </aside>
  );
}
