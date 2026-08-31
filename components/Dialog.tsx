"use client";

// components/Dialog.tsx — small reusable accessible modal, built on the
// native <dialog> element the same way MobileFilterDrawer's filter sheet
// already is: showModal() gives a real focus trap, Escape-to-close, an
// inert background page, and focus moving into the dialog, all for free
// from the browser — no ARIA framework to hand-roll, no dependency to
// add. Explicit focus-return below (rather than relying on each
// browser's own restore-focus implementation) makes that one behavior
// consistent everywhere. Reused by every product-detail dialog (Request
// a Quote, Request Customization, Warranty, Protection) instead of four
// near-identical modal implementations.
import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import styles from "./Dialog.module.css";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** "start" (default) keeps every existing dialog's left-aligned title +
   * top-right close button, unchanged. "center" is opt-in — used by
   * AuthModal for a branded, centered heading — and only centers the
   * title text; the close button stays top-right either way. */
  align?: "start" | "center";
  /** Overrides the CSS default (85vh) via inline style — opt-in, so
   * every existing caller that omits this keeps that default exactly
   * as before. AuthModal uses a taller cap (see its own comment) since
   * its content (especially Create Account's extra field) needed more
   * room to fit without the internal scroll .body falls back to once
   * content exceeds this. */
  maxHeight?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Dialog({ open, onClose, title, children, align = "start", maxHeight }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // The dialog element is always rendered (never conditionally) so the
  // ref is stable across re-renders and the CSS entrance/exit transition
  // above can actually play both ways — this effect is what turns the
  // `open` boolean into the imperative showModal()/close() calls the
  // native element itself requires.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Fires for every native close path (Escape, .close(), the backdrop
    // click handled below) so onClose and focus-return only need wiring
    // once here, instead of being repeated in every button handler.
    function handleClose() {
      onClose();
      previouslyFocusedRef.current?.focus();
    }
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  function handleBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    // The dialog element is itself the full backdrop area once open — a
    // click landing on it directly (not on a descendant like .header or
    // .body, which would make e.target something inside them) means the
    // click was outside the visible panel.
    if (e.target === dialogRef.current) dialogRef.current?.close();
  }

  // showModal() reliably keeps the rest of the page inert (nothing
  // behind the dialog is reachable), but confirmed by testing: it does
  // NOT reliably wrap Tab from the last focusable element back to the
  // first across engines — without this, Tab past the last element (or
  // Shift+Tab back past the first) lands on <body> for one step before
  // re-entering the dialog on the next press, instead of cycling
  // directly. This handler is what makes it a real, immediate cycle.
  function handleKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      style={maxHeight ? { maxHeight } : undefined}
      aria-labelledby={titleId}
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className={`${styles.header} ${align === "center" ? styles.headerCenter : ""}`}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => dialogRef.current?.close()}
          aria-label="Close dialog"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
