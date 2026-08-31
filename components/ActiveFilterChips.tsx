// components/ActiveFilterChips.tsx — server component, same pattern as
// FilterSidebar: real <Link>s that drop one filter and go back to page 1,
// so removing a chip works with zero client-side JS.
import Link from "next/link";
import { CATEGORY_LABELS } from "@/services/productData";
import { buildFilterHref, type ListingFilters } from "@/services/productService";
import type { ProductCondition } from "@/types/product";
import styles from "./ActiveFilterChips.module.css";

const CONDITION_LABELS: Record<ProductCondition, string> = {
  "brand-new": "Brand new",
  refurbished: "Refurbished",
  old: "Old items",
};

interface Chip {
  label: string;
  href: string;
}

export default function ActiveFilterChips({ active }: { active: ListingFilters }) {
  const chips: Chip[] = [];

  if (active.category) {
    chips.push({
      label: `Category: ${CATEGORY_LABELS[active.category]}`,
      href: buildFilterHref(active, { category: undefined }),
    });
  }
  if (active.brand) {
    chips.push({ label: `Brand: ${active.brand}`, href: buildFilterHref(active, { brand: undefined }) });
  }
  if (active.q) {
    chips.push({ label: `Search: "${active.q}"`, href: buildFilterHref(active, { q: undefined }) });
  }
  if (active.verifiedOnly) {
    chips.push({ label: "Verified", href: buildFilterHref(active, { verifiedOnly: false }) });
  }
  if (active.dealsOnly) {
    chips.push({ label: "Deals", href: buildFilterHref(active, { dealsOnly: false }) });
  }
  if (active.condition) {
    chips.push({
      label: `Condition: ${CONDITION_LABELS[active.condition]}`,
      href: buildFilterHref(active, { condition: undefined }),
    });
  }
  if (active.minRating) {
    chips.push({ label: `Rating: ${active.minRating}+`, href: buildFilterHref(active, { minRating: undefined }) });
  }
  if (active.minPrice != null || active.maxPrice != null) {
    const label =
      active.minPrice != null && active.maxPrice != null
        ? `Price: $${active.minPrice}–$${active.maxPrice}`
        : active.minPrice != null
          ? `Price: $${active.minPrice}+`
          : `Price: up to $${active.maxPrice}`;
    chips.push({ label, href: buildFilterHref(active, { minPrice: undefined, maxPrice: undefined }) });
  }

  if (chips.length === 0) return null;

  return (
    <ul className={styles.chipList} aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.label}>
          <Link href={chip.href} className={styles.chip}>
            {chip.label}
            <span aria-hidden="true" className={styles.chipRemove}>
              ×
            </span>
            <span className="sr-only">, remove this filter</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
