"use client";

// ============================================================
// components/SearchHistoryDropdown.tsx — the "recent searches" panel
// that appears below the navbar search field (YouTube-style: pick a
// past term to search it again, or remove one you don't want to see
// again). Purely presentational — Navbar.tsx owns the open/close
// state, focus/outside-click/Escape handling, and the localStorage-
// backed list itself (via hooks/useSearchHistory.ts).
// ============================================================
import Image from "next/image";
import Link from "next/link";
import { Clock, X } from "lucide-react";
import PriceDisplay from "@/components/PriceDisplay";
import type { Product } from "@/types/product";
import styles from "./SearchHistoryDropdown.module.css";

interface SearchHistoryDropdownProps {
  history: string[];
  /** Real catalog matches for the current query (already capped by the
   * caller) — empty whenever the query is blank, since matching every
   * product against nothing isn't a useful suggestion. */
  products: Product[];
  query: string;
  onSelectHistory: (term: string) => void;
  onRemoveHistory: (term: string) => void;
  onClearAllHistory: () => void;
  onSelectProduct: () => void;
}

export default function SearchHistoryDropdown({
  history,
  products,
  query,
  onSelectHistory,
  onRemoveHistory,
  onClearAllHistory,
  onSelectProduct,
}: SearchHistoryDropdownProps) {
  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  // Narrows to matching terms while typing, same as it showing the
  // full list on an empty, freshly-focused search field.
  const filteredHistory = lowerQuery ? history.filter((term) => term.toLowerCase().includes(lowerQuery)) : history;
  // Only a real, actively-typed search with zero catalog matches counts
  // as "no results" worth saying so about — an empty, untouched box
  // just has nothing to report yet.
  const showNoProductsNotice = trimmedQuery !== "" && products.length === 0;
  // Was an early `return null` — a freshly-focused search box with no
  // query typed yet and no history ever recorded rendered nothing at
  // all, which reads to a real user as "the dropdown doesn't open."
  // Panel now always renders while open; this is the one case where it
  // renders with only an empty-state message instead of real content.
  const hasNothingToShow = filteredHistory.length === 0 && products.length === 0 && !showNoProductsNotice;

  return (
    <div id="search-history-listbox" className={styles.panel} role="listbox" aria-label="Search suggestions">
      {hasNothingToShow && <p className={styles.emptyState}>No recent searches yet.</p>}

      {(products.length > 0 || showNoProductsNotice) && (
        <div className={styles.section}>
          <div className={styles.header}>
            <span className={styles.headerLabel}>Products</span>
          </div>
          {showNoProductsNotice ? (
            <p className={styles.noMatchNotice}>No products match &ldquo;{trimmedQuery}&rdquo;.</p>
          ) : (
            <ul className={styles.list}>
              {products.map((product) => (
                <li key={product.id} className={styles.item}>
                  <Link
                    href={`/product/${product.id}`}
                    className={styles.productItemBtn}
                    role="option"
                    aria-selected={false}
                    onClick={onSelectProduct}
                  >
                    <Image src={product.img} alt="" width={32} height={32} className={styles.productThumb} />
                    <span className={styles.itemText}>{product.name}</span>
                    <span className={styles.productPrice}>
                      <PriceDisplay amountUsd={product.price} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {filteredHistory.length > 0 && (
        <div className={styles.section}>
          <div className={styles.header}>
            <span className={styles.headerLabel}>Recent searches</span>
            <button type="button" className={styles.clearAllBtn} onClick={onClearAllHistory}>
              Clear all
            </button>
          </div>
          <ul className={styles.list}>
            {filteredHistory.map((term) => (
              <li key={term} className={styles.item}>
                <button
                  type="button"
                  className={styles.itemBtn}
                  role="option"
                  aria-selected={false}
                  onClick={() => onSelectHistory(term)}
                >
                  <Clock size={15} aria-hidden="true" className={styles.itemIcon} />
                  <span className={styles.itemText}>{term}</span>
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  aria-label={`Remove "${term}" from recent searches`}
                  onClick={() => onRemoveHistory(term)}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
