"use client";

// components/QuoteRequestDialog.tsx — "Request a Quote" trigger + form,
// rendered next to Add to Cart in ProductPurchasePanel. This replaces
// the old static "Price: Negotiable" spec row, which described an
// action ("negotiate") the UI never actually offered anywhere. This one
// is a real, if frontend-only, interaction: the buyer proposes a
// quantity and target price, submitting validates the input and shows a
// local success state. There is no backend behind this prototype, so
// nothing is actually transmitted to a supplier — see the note rendered
// in the dialog body, which says exactly that to the user too.
import { useId, useState, type FormEvent } from "react";
import { MessageSquareText, CheckCircle2 } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import Dialog from "./Dialog";
import QuantityStepper from "./QuantityStepper";
import styles from "./RequestDialogs.module.css";

interface QuoteRequestDialogProps {
  productName: string;
  defaultQuantity: number;
  defaultUnitPrice: number;
}

export default function QuoteRequestDialog({
  productName,
  defaultQuantity,
  defaultUnitPrice,
}: QuoteRequestDialogProps) {
  const { currency, convert } = useCurrency();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(defaultQuantity);
  // Seeded in the shopper's currently-selected currency (not always
  // USD) — they're negotiating in whatever they're already browsing
  // in, same as every other price shown on this page.
  const [targetPrice, setTargetPrice] = useState(convert(defaultUnitPrice).toFixed(2));
  const [message, setMessage] = useState("");
  const [priceError, setPriceError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const qtyFieldId = useId();
  const priceFieldId = useId();
  const messageFieldId = useId();
  const priceErrorId = useId();

  // Re-seed every time the dialog is freshly opened, from whatever the
  // purchase panel's quantity/unit price are AT THAT MOMENT — so bumping
  // quantity there first and then opening this reflects that, instead of
  // always showing a stale default from first render. Done during render
  // (React's documented pattern for "adjusting state when a prop
  // changes"), not in a useEffect — an effect here would commit the
  // stale/default values for one frame first and then immediately
  // re-render with the reset ones, which is exactly the redundant extra
  // render this pattern avoids.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuantity(defaultQuantity);
      setTargetPrice(convert(defaultUnitPrice).toFixed(2));
      setMessage("");
      setPriceError("");
      setSubmitted(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = Number(targetPrice);
    if (!targetPrice.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setPriceError(`Enter a target price greater than ${currency.symbol}0.`);
      return;
    }
    setPriceError("");
    // Frontend prototype only — see the note rendered below. No network
    // request is made; this just transitions to the local success state.
    setSubmitted(true);
  }

  return (
    <>
      <button type="button" className={styles.secondaryTrigger} onClick={() => setOpen(true)}>
        <MessageSquareText size={16} aria-hidden="true" />
        Request a Quote
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Request a Quote">
        {submitted ? (
          <div className={styles.successState} aria-live="polite">
            <CheckCircle2 size={28} aria-hidden="true" className={styles.successIcon} />
            <p className={styles.successText}>Quote request sent successfully.</p>
            <p className={styles.note}>
              This is a frontend prototype interaction — no request was actually sent to a supplier.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryBtn} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <span className={styles.label}>Product</span>
              <p className={styles.readonlyValue}>{productName}</p>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={qtyFieldId}>
                Quantity
              </label>
              <QuantityStepper id={qtyFieldId} value={quantity} onChange={setQuantity} />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={priceFieldId}>
                Target price per unit <span className={styles.optional}>({currency.code})</span>
              </label>
              <input
                id={priceFieldId}
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className={styles.input}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                aria-invalid={priceError ? "true" : undefined}
                aria-describedby={priceError ? priceErrorId : undefined}
              />
              {priceError && (
                <p id={priceErrorId} className={styles.errorText} role="alert">
                  {priceError}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor={messageFieldId}>
                Message <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id={messageFieldId}
                className={styles.textarea}
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="I'd like a better price for this quantity."
              />
            </div>

            <p className={styles.note}>
              Frontend prototype — submitting this form does not contact a real supplier.
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryBtn} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn}>
                Send Quote Request
              </button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
