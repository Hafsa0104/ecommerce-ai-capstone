"use client";

// components/QuantityStepper.tsx — the [-] qty [+] control shared by
// ProductPurchasePanel and the Quote/Customization request dialogs.
// Extracted so all three use one implementation instead of three near-
// identical copies of the same markup and clamping logic.
import { useRef, useState, type KeyboardEvent } from "react";
import styles from "./QuantityStepper.module.css";

interface QuantityStepperProps {
  id: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  /** Ties the one-time "you can type a quantity directly" hint to a
   * specific product, persisted in localStorage so it shows at most
   * once ever for that product (see bumpClickCount below). Omit to
   * disable the hint entirely — the Quote/Customization dialogs reuse
   * this same control but don't opt in, since the nudge is about this
   * particular repeated-clicking pattern on the main product page, not
   * something worth re-teaching inside a dialog for the same product. */
  hintKey?: string;
}

// "3 to 4 times" per the reported pattern — 4 is the upper end of that,
// erring toward not interrupting someone who only clicked a couple of
// times to bump the quantity by a little.
const HINT_CLICK_THRESHOLD = 4;

export default function QuantityStepper({ id, value, onChange, min = 1, hintKey }: QuantityStepperProps) {
  // Local draft text, decoupled from `value` while the field has focus —
  // without this, clamping the input's value on every keystroke (the
  // previous behavior) forced it back to `min` the instant it went
  // empty. Selecting the existing "1" and deleting it to type a fresh
  // "21" produces exactly that empty instant, so the field could never
  // actually be cleared to type a new number into — it just kept
  // snapping back to 1. Only normalized/clamped back to a real number on
  // blur or Enter; a live update still happens on every keystroke that
  // already parses to a valid number ≥ min, so typing "21" digit by
  // digit still updates the quantity (and this panel's Subtotal) as you
  // go — it's only the specific empty/invalid intermediate states that
  // no longer force a premature reset.
  const [draft, setDraft] = useState(String(value));
  const [showHint, setShowHint] = useState(false);
  const clickCountRef = useRef(0);

  // Keeps the draft in sync when `value` changes from elsewhere (the
  // +/- buttons, or a parent resetting it) — React's "adjusting state
  // when a prop changes" pattern (same technique AuthModal.tsx already
  // uses), not a useEffect: this needs to happen before the render that
  // shows the stale draft commits, not after. Typing itself never
  // changes `value` until blur/Enter (see above), so this can't clobber
  // an in-progress edit.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(String(value));
  }

  function commit(raw: string) {
    const parsed = Math.max(min, parseInt(raw, 10) || min);
    onChange(parsed);
    setDraft(String(parsed));
    setShowHint(false);
  }

  // Live-updates on any non-negative number typed, not just ones that
  // already clear `min` — deliberately including 0. Gating this at
  // `>= min` (the earlier version) meant typing a bare "0" left
  // `value` frozen at whatever it was before, so the field showed "0"
  // while the Subtotal elsewhere kept showing an unrelated, stale
  // total for a quantity that wasn't on screen anymore — exactly the
  // "total that is not correct" mismatch reported. Letting `value` (and
  // so the Subtotal) actually reflect a typed 0 keeps what's displayed
  // honest at every step; 0 is still never a valid FINAL quantity — see
  // commit() below, and ProductPurchasePanel's Add to Cart guard against
  // this exact transient state.
  function handleInputChange(raw: string) {
    setDraft(raw);
    if (raw === "") return; // let the field sit empty while mid-edit
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChange(Math.floor(parsed));
      if (parsed >= min) setShowHint(false); // they followed the tip for a real quantity — no need to keep showing it
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    commit(draft);
  }

  // Counts +/- clicks (typing doesn't call this) and shows the hint
  // once the threshold is crossed — but only ever once per product,
  // ever: checked AND recorded in localStorage, not just this
  // component's own in-memory state, so revisiting the same product
  // later doesn't show it again either. Silently gives up on the
  // persistence (still shows the hint once, just may repeat on a later
  // visit) if localStorage is unavailable — private browsing, blocked
  // storage — rather than crashing the stepper over a non-essential nudge.
  function bumpClickCount() {
    if (!hintKey || showHint) return;
    clickCountRef.current += 1;
    if (clickCountRef.current < HINT_CLICK_THRESHOLD) return;

    const storageKey = `tradehub:qty-hint-seen:${hintKey}`;
    try {
      if (window.localStorage.getItem(storageKey) === "1") return;
    } catch {
      // Unavailable — fall through and show it anyway, just this once.
    }
    setShowHint(true);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Best-effort — if it can't be saved, the hint may reappear on a
      // future visit, a harmless fallback rather than a broken feature.
    }
  }

  return (
    <div className={styles.qtyWrap}>
      <div className={styles.qtyControl}>
        <button
          type="button"
          className={styles.qtyBtn}
          onClick={() => {
            onChange(Math.max(min, value - 1));
            bumpClickCount();
          }}
          aria-label="Decrease quantity"
          disabled={value <= min}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          min={min}
          value={draft}
          // Shown once the field is actually empty (cleared to type a
          // fresh number) — a visual "type a quantity here" cue, not a
          // real value; it never gets submitted as 0 itself (see
          // commit()/handleInputChange above, which never let a lone 0
          // survive past blur).
          placeholder="0"
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={handleKeyDown}
          className={styles.qtyInput}
        />
        {/* No upper limit: `Product` has no stock/max-quantity field
            anywhere in the catalog, so disabling this at some invented
            ceiling would enforce a constraint the data doesn't have. */}
        <button
          type="button"
          className={styles.qtyBtn}
          onClick={() => {
            onChange(value + 1);
            bumpClickCount();
          }}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      {showHint && (
        <p className={styles.qtyHint} aria-live="polite">
          Tip: you can type a quantity directly instead of clicking multiple times.
          <button
            type="button"
            className={styles.qtyHintDismiss}
            onClick={() => setShowHint(false)}
            aria-label="Dismiss tip"
          >
            ×
          </button>
        </p>
      )}
    </div>
  );
}
