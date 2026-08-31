"use client";

// ============================================================
// components/MobileNavDrawer.tsx — the hamburger menu that replaces
// the header's account links + the whole second (category/deliver-to/
// language) row below a certain width. Same native <dialog>+showModal()
// pattern as MobileFilterDrawer.tsx (the browser handles the focus
// trap, Escape-to-close, and making the rest of the page inert for
// free) — a left-edge slide-in sheet here instead of a bottom sheet,
// since this is primary site navigation, not a filter panel.
//
// Self-contained: owns its own trigger button AND dialog, same as
// MobileFilterDrawer — Navbar.tsx just renders <MobileNavDrawer .../>
// with the couple of pieces of state (signed-in, wishlist count) it
// can't get for itself.
// ============================================================
import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { Menu, X, User, MessageCircle, Package, Heart, Home, Tag, TrendingUp, HelpCircle, LayoutGrid } from "lucide-react";
import { CATEGORY_LABELS } from "@/services/productData";
import DeliverToSelector from "@/components/DeliverToSelector";
import LanguageCurrencySelector from "@/components/LanguageCurrencySelector";
import type { CategoryKey } from "@/types/product";
import styles from "./MobileNavDrawer.module.css";

const CATEGORY_ENTRIES = Object.entries(CATEGORY_LABELS) as [CategoryKey, string][];

interface MobileNavDrawerProps {
  isSignedIn: boolean;
  wishlistCount: number;
}

export default function MobileNavDrawer({ isSignedIn, wishlistCount }: MobileNavDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    function handleClose() {
      triggerRef.current?.focus();
    }
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) dialogRef.current?.close();
  }

  // Every link inside closes the sheet on click — client-side
  // navigation doesn't unmount Navbar (it lives in the root layout),
  // so without this the drawer would stay open, now covering the
  // page the user just navigated to.
  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        aria-label="Open menu"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Menu size={22} aria-hidden="true" />
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onClick={handleDialogClick}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Menu
          </h2>
          <button type="button" className={styles.closeBtn} onClick={close} aria-label="Close menu">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.body}>
          <ul className={styles.linkList}>
            <li>
              <Link href={isSignedIn ? "/profile" : "/sign-in"} className={styles.linkItem} onClick={close}>
                <User size={20} aria-hidden="true" />
                {isSignedIn ? "Profile" : "Sign In"}
              </Link>
            </li>
            <li>
              <Link href="/messages" className={styles.linkItem} onClick={close}>
                <MessageCircle size={20} aria-hidden="true" />
                Messages
              </Link>
            </li>
            <li>
              <Link href="/profile#orders" className={styles.linkItem} onClick={close}>
                <Package size={20} aria-hidden="true" />
                Orders
              </Link>
            </li>
            <li>
              <Link href="/wishlist" className={styles.linkItem} onClick={close}>
                <Heart size={20} aria-hidden="true" />
                Wishlist
                {wishlistCount > 0 && (
                  <span className={styles.badge} aria-hidden="true">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>
            </li>
          </ul>

          <div className={styles.divider} />

          <ul className={styles.linkList}>
            <li>
              <Link href="/" className={styles.linkItem} onClick={close}>
                <Home size={20} aria-hidden="true" />
                Home
              </Link>
            </li>
            <li>
              <Link href="/listing?deals=1" className={`${styles.linkItem} ${styles.dealsLink}`} onClick={close}>
                <Tag size={20} aria-hidden="true" />
                Deals
              </Link>
            </li>
            <li>
              <Link href="/listing?sort=trending" className={styles.linkItem} onClick={close}>
                <TrendingUp size={20} aria-hidden="true" />
                Trending
              </Link>
            </li>
            <li>
              <Link href="/support" className={styles.linkItem} onClick={close}>
                <HelpCircle size={20} aria-hidden="true" />
                Help
              </Link>
            </li>
          </ul>

          <div className={styles.divider} />

          <h3 className={styles.sectionLabel}>Categories</h3>
          <ul className={styles.linkList}>
            <li>
              <Link href="/listing" className={styles.linkItem} onClick={close}>
                <LayoutGrid size={20} aria-hidden="true" />
                All categories
              </Link>
            </li>
            {CATEGORY_ENTRIES.map(([key, label]) => (
              <li key={key}>
                <Link href={`/listing?category=${key}`} className={styles.categoryLinkItem} onClick={close}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.divider} />

          <h3 className={styles.sectionLabel}>Preferences</h3>
          <div className={styles.preferencesRow}>
            <DeliverToSelector />
            <LanguageCurrencySelector />
          </div>
        </div>
      </dialog>
    </>
  );
}
