"use client";

// components/CategoryFlyout.tsx — "All Category" trigger for the site's
// category mega menu. Opens on click/Enter/Space, on keyboard focus
// (tabbing onto the trigger), and, as a pointer enhancement, on hover —
// with a close delay and a focus guard so moving from the trigger into
// the panel, or tabbing through it with a keyboard, never gets fought by
// a stray mouseleave. Closes when focus moves past the panel's own
// content to whatever comes next in the navbar (see handleWrapBlur),
// mirroring how mouseleave already closes it for pointer users.
//
// The panel is plain nav content (a labelled list of real links), not an
// ARIA "menu" — role="menu"/"menuitem" implies application-menu keyboard
// behavior (arrow-only navigation, no Tab) that a set of navigation links
// shouldn't opt into. See the WAI-ARIA APG note on menu vs. navigation.
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ChevronRight } from "lucide-react";
import { CATEGORY_LABELS } from "@/services/productData";
import { getCategoryPreview } from "@/services/productService";
import type { CategoryKey } from "@/types/product";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useCurrency } from "@/context/CurrencyContext";
import styles from "./CategoryFlyout.module.css";

const CATEGORY_ENTRIES = Object.entries(CATEGORY_LABELS) as [CategoryKey, string][];
const PANEL_ID = "category-megamenu";
const OPEN_DELAY_MS = 80;
const CLOSE_DELAY_MS = 120;

export default function CategoryFlyout() {
  const { open, setOpen, toggle, close, triggerRef, panelRef } = useDisclosure();
  const { formatPrice } = useCurrency();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>(CATEGORY_ENTRIES[0][0]);
  const closeTimeoutRef = useRef<number | null>(null);
  const openTimeoutRef = useRef<number | null>(null);
  // Set on the trigger's mousedown/pointerdown, just ahead of the focus
  // event a mouse click also produces — lets the focus handler tell a
  // real mouse click apart from a keyboard Tab landing on the trigger,
  // without adding a second, parallel "is this keyboard" mechanism.
  // Reset on a 0ms timeout rather than only inside the focus handler
  // itself: re-clicking a trigger that's already focused fires no new
  // focus event at all, which would otherwise leave this stuck "true"
  // and silently swallow the next real keyboard focus.
  const pointerDownRef = useRef(false);
  // useDisclosure's own Escape handling closes the panel AND calls
  // triggerRef.current.focus() to send focus back to the trigger — but
  // that focus() call synchronously fires the trigger's onFocus below,
  // which (per handleTriggerFocus) would otherwise immediately reopen
  // what Escape just closed. Set for the duration of an Escape
  // keydown, via a capture-phase listener that runs before
  // useDisclosure's own bubble-phase one, so it's already true by the
  // time that focus() call happens.
  const suppressFocusOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    function handleEscapeCapture(e: KeyboardEvent) {
      if (e.key === "Escape") suppressFocusOpenRef.current = true;
    }
    document.addEventListener("keydown", handleEscapeCapture, { capture: true });
    return () => document.removeEventListener("keydown", handleEscapeCapture, { capture: true });
  }, [open]);

  function clearPendingClose() {
    if (closeTimeoutRef.current != null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function clearPendingOpen() {
    if (openTimeoutRef.current != null) {
      window.clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  }

  function handleMouseEnter() {
    clearPendingClose();
    // Deliberately delayed, not instant: a real mouse click on the
    // trigger *also* fires mouseenter a moment before the click itself,
    // so an instant setOpen(true) here would race the click handler's
    // toggle() and immediately re-close what the click just opened
    // (confirmed — this broke plain mouse clicks and touch taps, which
    // synthesize the same sequence). Opening a beat later than any click
    // can land sidesteps the race, and as a side effect also avoids
    // popping the menu open on a fast mouse pass across the nav row.
    clearPendingOpen();
    openTimeoutRef.current = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }

  function handleMouseLeave() {
    clearPendingOpen();
    // Small delay, not an instant close — the trigger and panel are
    // adjacent with no gap (see .panel), but trackpads/diagonal moves can
    // still land a frame outside both for an instant. Also never close
    // out from under a keyboard user who's still tabbing through it.
    clearPendingClose();
    closeTimeoutRef.current = window.setTimeout(() => {
      const active = document.activeElement;
      if (panelRef.current?.contains(active) || triggerRef.current?.contains(active)) return;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  }

  useEffect(
    () => () => {
      clearPendingClose();
      clearPendingOpen();
    },
    []
  );

  function handleTriggerPointerDown() {
    pointerDownRef.current = true;
    window.setTimeout(() => {
      pointerDownRef.current = false;
    }, 0);
  }

  function handleTriggerFocus() {
    // Escape just closed the panel and is restoring focus to us
    // (useDisclosure) — don't reopen it right back up.
    if (suppressFocusOpenRef.current) {
      suppressFocusOpenRef.current = false;
      return;
    }
    // A mouse click focuses the trigger a moment before its own click
    // handler fires (see handleTriggerPointerDown) — the click's
    // toggle() already opens/closes the panel, so opening here too
    // would just fight it. Keyboard focus (Tab) has no such click
    // event behind it, so it's the only case that reaches here.
    if (pointerDownRef.current) return;
    clearPendingClose();
    clearPendingOpen();
    setOpen(true);
  }

  function handleWrapBlur(e: React.FocusEvent<HTMLDivElement>) {
    // Fires (React's onBlur bubbles) whenever a focusable descendant of
    // .wrap loses focus. Only close if focus actually left the trigger
    // AND the panel — i.e. the user tabbed on to the next navbar
    // control — not merely moved from one flyout link to the next.
    const next = e.relatedTarget as Node | null;
    if (next && (triggerRef.current?.contains(next) || panelRef.current?.contains(next))) return;
    clearPendingOpen();
    clearPendingClose();
    setOpen(false);
  }

  function handleCategoryListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const links = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>("a"));
    const currentIndex = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (currentIndex === -1) return;
    e.preventDefault();
    const nextIndex =
      e.key === "ArrowDown"
        ? Math.min(currentIndex + 1, links.length - 1)
        : e.key === "ArrowUp"
          ? Math.max(currentIndex - 1, 0)
          : e.key === "Home"
            ? 0
            : links.length - 1;
    links[nextIndex]?.focus();
  }

  const previewLabel = CATEGORY_LABELS[activeCategory];
  // 8 above the mega-menu breakpoint (4x2 grid — see .previewGrid), but
  // that grid is display:none below it, so the extra items never render
  // visibly there; PRODUCTS itself has as few as 6 items in some
  // categories, so this is already just "up to 8", never padded/invented.
  const previewProducts = getCategoryPreview(activeCategory, 8);

  return (
    <div
      className={styles.wrap}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onBlur={handleWrapBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={toggle}
        onPointerDown={handleTriggerPointerDown}
        onFocus={handleTriggerFocus}
      >
        {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        All Category
      </button>

      {open && (
        <div id={PANEL_ID} ref={panelRef} className={styles.panel}>
          {/* Wrapping div, not extra classes on .panel itself: below the
              mega-menu breakpoint .panel is a normal small anchored
              dropdown (no centering needed); above it, .panel becomes a
              full-bleed fixed band and this centers its content to the
              site's usual max width, matching every other "wrap". */}
          <div className={styles.panelInner}>
            <div className={styles.megaBody}>
              <ul className={styles.list} onKeyDown={handleCategoryListKeyDown}>
                {CATEGORY_ENTRIES.map(([key, label]) => (
                  <li key={key}>
                    <Link
                      href={`/listing?category=${key}`}
                      onClick={close}
                      onMouseEnter={() => setActiveCategory(key)}
                      onFocus={() => setActiveCategory(key)}
                      className={`${styles.item} ${activeCategory === key ? styles.itemActive : ""}`}
                    >
                      {label}
                      <ChevronRight size={16} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Preview pane — desktop only (see the min-width query in
                  CategoryFlyout.module.css); on narrow screens the category
                  list above is the whole menu, and tapping a category goes
                  straight to its full (more capable) listing page instead. */}
              <div className={styles.previewPane} aria-label={`${previewLabel} highlights`}>
                <p className={styles.previewHeading}>{previewLabel}</p>
                {previewProducts.length > 0 ? (
                  <ul className={styles.previewGrid}>
                    {previewProducts.map((product) => (
                      <li key={product.id}>
                        <Link href={`/product/${product.id}`} onClick={close} className={styles.previewCard}>
                          <Image
                            src={product.img}
                            alt={product.name}
                            width={56}
                            height={56}
                            className={styles.previewImage}
                          />
                          <span className={styles.previewName}>{product.name}</span>
                          <span className={styles.previewPrice}>{formatPrice(product.price)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.previewEmpty}>No products in this category yet.</p>
                )}
                <Link href={`/listing?category=${activeCategory}`} onClick={close} className={styles.previewViewAll}>
                  View all {previewLabel}
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
