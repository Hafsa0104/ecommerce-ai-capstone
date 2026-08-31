"use client";

// components/Pagination.tsx — the listing page's pagination nav, pulled
// out into its own (small) client component only because the keyboard
// enhancement below needs a keydown handler; everything else about it
// is unchanged: real Next.js <Link>s built from the same buildPageHref
// used everywhere else, so URLs/query params/refresh/back-forward all
// behave exactly as before. The rest of the listing page stays a plain
// server component.
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { buildPageHref, type ListingFilters } from "@/services/productService";
import styles from "./Pagination.module.css";

interface PaginationProps {
  active: ListingFilters;
  page: number;
  totalPages: number;
}

export default function Pagination({ active, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Arrow-key roving, same established pattern as CategoryFlyout's
  // category list: real links, native Tab order untouched (nothing gets
  // tabindex=-1, so this never becomes a "tabs" widget), arrow keys are
  // just a faster way to move between controls that are already
  // reachable one at a time via Tab. Home/End specifically target the
  // first/last *page number* (not Previous/Next), which is what most
  // users mean by "jump to the first/last page"; Left/Right step through
  // every control in order, including Previous/Next at the ends.
  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const nav = e.currentTarget;
    const allLinks = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a"));
    const pageLinks = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a[data-page-number]"));
    const currentIndex = allLinks.indexOf(document.activeElement as HTMLAnchorElement);
    if (currentIndex === -1) return;

    e.preventDefault();
    if (e.key === "ArrowLeft") {
      allLinks[Math.max(currentIndex - 1, 0)]?.focus();
    } else if (e.key === "ArrowRight") {
      allLinks[Math.min(currentIndex + 1, allLinks.length - 1)]?.focus();
    } else if (e.key === "Home") {
      pageLinks[0]?.focus();
    } else {
      pageLinks[pageLinks.length - 1]?.focus();
    }
  }

  return (
    <nav className={styles.pagination} aria-label="Search results pages" onKeyDown={handleKeyDown}>
      <Link
        href={buildPageHref(active, Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={`${styles.pgBtn} ${page === 1 ? styles.pgBtnDisabled : ""}`}
      >
        <span className="sr-only">Previous page</span>
        <span aria-hidden="true">‹</span>
      </Link>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={buildPageHref(active, p)}
          data-page-number="true"
          className={`${styles.pgBtn} ${p === page ? styles.pgBtnActive : ""}`}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </Link>
      ))}

      <Link
        href={buildPageHref(active, Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={`${styles.pgBtn} ${page === totalPages ? styles.pgBtnDisabled : ""}`}
      >
        <span className="sr-only">Next page</span>
        <span aria-hidden="true">›</span>
      </Link>
    </nav>
  );
}
