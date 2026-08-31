"use client";

// components/ProductPurchasePanel.tsx — quantity input, price-tier
// display (highlights the tier the current quantity falls into),
// Request a Quote, and Add to Cart. Client component because it needs
// interactive state; the rest of the product page stays server-rendered.
import { useMemo, useState } from "react";
import { ShoppingCart, Check, CheckCircle2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import type { PriceTier } from "@/types/product";
import QuantityStepper from "./QuantityStepper";
import QuoteRequestDialog from "./QuoteRequestDialog";
import styles from "./ProductPurchasePanel.module.css";

interface ProductPurchasePanelProps {
  productId: string;
  productName: string;
  priceTiers: PriceTier[];
}

export default function ProductPurchasePanel({ productId, productName, priceTiers }: ProductPurchasePanelProps) {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const activeTierIndex = useMemo(() => {
    const idx = priceTiers.findIndex(
      (t) => quantity >= t.qtyFrom && (t.qtyTo === null || quantity <= t.qtyTo)
    );
    return idx === -1 ? 0 : idx;
  }, [priceTiers, quantity]);

  const unitPrice = priceTiers[activeTierIndex]?.price ?? priceTiers[0]?.price ?? 0;

  // `quantity` can legitimately be 0 for a moment — the field shows an
  // honest, live Subtotal while a "0" is typed (see QuantityStepper's
  // handleInputChange), even though 0 is never a valid final order.
  // Guards this one real consumer of that transient value directly,
  // rather than relying on the field's own blur-clamp alone: a click on
  // this button doesn't blur the input first.
  const canAddToCart = quantity >= 1;

  function handleAddToCart() {
    if (!canAddToCart) return;
    addItem(productId, quantity);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.priceBox} role="group" aria-label="Price by order quantity">
        {priceTiers.map((tier, i) => (
          <div
            key={tier.label}
            // Border/tint is a secondary cue on top of aria-current, not
            // the only signal — same reasoning FilterSidebar's active
            // category/condition/rating links already apply, applied
            // here to the one place on this page it was still missing.
            aria-current={i === activeTierIndex ? "true" : undefined}
            className={`${styles.priceItem} ${i === activeTierIndex ? styles.priceItemActive : ""}`}
          >
            <h3 className={styles.priceValue}>{formatPrice(tier.price)}</h3>
            <small>{tier.label}</small>
          </div>
        ))}
      </div>

      <div className={styles.qtyRow}>
        <label htmlFor="quantity" className={styles.qtyLabel}>
          Quantity
        </label>
        <QuantityStepper id="quantity" value={quantity} onChange={setQuantity} hintKey={productId} />
        {/* Quantity/price-tier changes update this silently otherwise —
            same aria-live pattern already used below for the cart
            confirmation, applied here so the new subtotal is announced
            too. Comma-formatted (formatPrice), not a bare .toFixed(2) —
            a bulk-order quantity × unit price routinely lands in 6+
            digits, unreadable without thousands separators. The
            per-piece price alongside it answers "what am I being
            charged per unit" without needing to scroll back up to the
            price-tier box above to check which tier is active. */}
        <span className={styles.subtotal} aria-live="polite" aria-atomic="true">
          <strong className={styles.subtotalValue}>Subtotal: {formatPrice(unitPrice * quantity)}</strong>
          <span className={styles.subtotalUnit}>({formatPrice(unitPrice)}/piece)</span>
        </span>
      </div>

      {/* position: relative anchor for .addedPopup below — it's
          absolutely positioned against THIS row, not the whole panel,
          so it appears right under the buttons regardless of where
          else .panel's content shifts. */}
      <div className={styles.actionsRow}>
        {/* Real interaction behind what used to be a static "Price:
            Negotiable" spec-table row — see QuoteRequestDialog.tsx.
            Seeded from this panel's own live quantity/unit price so the
            dialog reflects whatever the shopper already has selected. */}
        <QuoteRequestDialog productName={productName} defaultQuantity={quantity} defaultUnitPrice={unitPrice} />

        <button
          type="button"
          className={`${styles.addCartBtn} ${justAdded ? styles.addCartBtnConfirmed : ""}`}
          onClick={handleAddToCart}
          disabled={!canAddToCart}
        >
          {justAdded ? (
            <>
              <Check size={18} aria-hidden="true" />
              Added to cart
            </>
          ) : (
            <>
              <ShoppingCart size={18} aria-hidden="true" />
              Add to Cart
            </>
          )}
        </button>

        {/* A real floating popup — elevated (box-shadow), absolutely
            positioned so it sits OVER the Specification content below
            rather than pushing it down, closable, not just an inline
            message sitting in the normal document flow. Anchored to
            .actionsRow (position: relative on that, not .panel) so it
            appears right under these buttons specifically. */}
        {justAdded && (
          <div className={styles.addedPopup} role="status" aria-live="polite">
            <CheckCircle2 size={18} aria-hidden="true" className={styles.addedPopupIcon} />
            <p className={styles.addedPopupText}>Added to cart successfully!</p>
            <button
              type="button"
              className={styles.addedPopupClose}
              onClick={() => setJustAdded(false)}
              aria-label="Dismiss"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
