"use client";

// components/MobileFilterDrawer.tsx — mobile-only wrapper around the
// existing FilterSidebar (passed in as children, unmodified). Uses the
// native <dialog> element rather than a hand-built modal: opened via
// showModal(), the browser handles the focus trap, Escape-to-close, and
// making the rest of the page inert, for free — no ARIA to add, no
// dependency to install. Only the bits the platform doesn't do for us
// (explicit focus-return, backdrop-click-to-close) are wired up here.
import { useEffect, useId, useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import styles from "./MobileFilterDrawer.module.css";

interface MobileFilterDrawerProps {
  children: React.ReactNode;
  activeCount: number;
}

export default function MobileFilterDrawer({ children, activeCount }: MobileFilterDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Covers every close path (Escape, backdrop click, the header/footer
    // buttons below) in one place, rather than repeating this in each
    // handler — native <dialog> fires "close" regardless of how it closed.
    function handleClose() {
      triggerRef.current?.focus();
    }
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    // The dialog element itself is the full-viewport backdrop area once
    // open — a click that lands on the dialog element (not on something
    // inside it, which would make e.target a descendant) means the user
    // clicked outside the sheet's content.
    if (e.target === dialogRef.current) dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" ref={triggerRef} className={styles.trigger} onClick={() => dialogRef.current?.showModal()}>
        <SlidersHorizontal size={16} aria-hidden="true" />
        Filters
        {activeCount > 0 && (
          <span className={styles.badge}>
            {activeCount}
            <span className="sr-only"> active</span>
          </span>
        )}
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onClick={handleDialogClick}>
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Filters
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close filters"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        <div className={styles.footer}>
          {/* "Done", not "Apply" — every control above already applies the
              moment it's clicked/submitted (they're real links/forms, not
              a staged draft), so this button only closes the sheet. */}
          <button type="button" className={styles.doneBtn} onClick={() => dialogRef.current?.close()}>
            Done
          </button>
        </div>
      </dialog>
    </>
  );
}
