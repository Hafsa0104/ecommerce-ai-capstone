"use client";

// app/checkout/page.tsx — Cart -> Checkout -> (Guest / Sign in / Create
// account) -> shipping details -> Place Order -> confirmation. Per this
// app's account-gating rule (see AuthContext), checkout is the one
// place a guest option belongs: unlike Wishlist/review Helpful votes,
// an order isn't inherently tied to an account, so asking to sign in
// before checking out at all would be exactly the friction the rule is
// meant to avoid. No real payment step — this app has no payment
// backend (see the Cart page's own existing disclosure) — so this ends
// at a mock order confirmation, the cart cleared, same honesty as
// everywhere else this app fakes a flow.
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { getProductById, getPriceTiers } from "@/services/productService";
import { generateOrderId, saveOrder, type Order } from "@/services/orderService";
import styles from "./page.module.css";

export default function CheckoutPage() {
  const { isSignedIn, user } = useAuth();
  const { requestAuth } = useAuthModal();
  const { items, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const [guestChosen, setGuestChosen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderId, setOrderId] = useState("");

  const rows = items
    .map((item) => {
      const product = getProductById(item.productId);
      if (!product) return null;
      const tiers = getPriceTiers(product);
      const tier = tiers.find((t) => item.quantity >= t.qtyFrom && (t.qtyTo === null || item.quantity <= t.qtyTo));
      const unitPrice = tier?.price ?? product.price;
      return { item, product, unitPrice, lineTotal: unitPrice * item.quantity };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const subtotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);

  const readyForDetails = isSignedIn || guestChosen;

  function handlePlaceOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const id = generateOrderId();

    // Only ever saved for a signed-in user — My Orders lives inside
    // Profile, which is itself gated behind sign-in (see AuthContext),
    // so a guest order has no account to attach it to. The
    // confirmation screen below says this honestly for a guest rather
    // than implying the order was saved somewhere it wasn't.
    if (isSignedIn && user) {
      const order: Order = {
        id,
        placedAt: new Date().toISOString(),
        items: rows.map(({ item, product, unitPrice, lineTotal }) => ({
          productId: item.productId,
          name: product.name,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        })),
        total: subtotal,
        shipping: {
          fullName: String(form.get("fullName") || ""),
          email: String(form.get("email") || ""),
          address: String(form.get("address") || ""),
          city: String(form.get("city") || ""),
          country: String(form.get("country") || ""),
        },
      };
      saveOrder(user.email, order);
    }

    setOrderId(id);
    setOrderTotal(subtotal);
    setOrderPlaced(true);
    clearCart();
  }

  if (orderPlaced) {
    return (
      <div className={`wrap ${styles.pageContainer}`}>
        <div className={styles.confirmation} role="status">
          <CheckCircle2 size={48} aria-hidden="true" className={styles.confirmIcon} />
          <h1 className={styles.confirmTitle}>Order placed</h1>
          <p className={styles.confirmOrderId}>Order #{orderId}</p>
          <p className={styles.confirmTotal}>Total: {formatPrice(orderTotal)}</p>
          {isSignedIn ? (
            <p className={styles.note}>
              Saved to your account — find it anytime under My orders in your profile. This is a frontend
              prototype, though: there is no payment provider or order-processing backend, so no real order was
              submitted.
            </p>
          ) : (
            <p className={styles.note}>
              You checked out as a guest, so this order isn&apos;t attached to an account — there&apos;s nowhere to
              look it up again in this prototype. Note your order number above if you need it. (This is a frontend
              prototype either way: there is no payment provider or order-processing backend, so no real order was
              submitted.)
            </p>
          )}
          <div className={styles.confirmActions}>
            {isSignedIn && (
              <Link href="/profile#orders" className={styles.secondaryLink}>
                View my orders
              </Link>
            )}
            <Link href="/listing" className={styles.primaryLink}>
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={`wrap ${styles.pageContainer}`}>
        <h1 className={styles.title}>Checkout</h1>
        <div className={styles.emptyState} role="status">
          <p>Your cart is empty.</p>
          <Link href="/listing" className={styles.primaryLink}>
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`wrap ${styles.pageContainer}`}>
      <h1 className={styles.title}>Checkout</h1>

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          {!readyForDetails ? (
            <section className={styles.chooseSection} aria-labelledby="choose-heading">
              <h2 id="choose-heading">How would you like to check out?</h2>
              <p className={styles.sectionSub}>
                Browsing, your cart, and this first step never require an account — sign in only if you want your
                order tied to one.
              </p>
              <div className={styles.choiceRow}>
                <button type="button" className={styles.choiceBtn} onClick={() => setGuestChosen(true)}>
                  <strong>Continue as Guest</strong>
                  <span>Check out now, no account needed</span>
                </button>
                <button
                  type="button"
                  className={styles.choiceBtn}
                  onClick={() =>
                    requestAuth({
                      actionReason: "track this order from your account",
                      allowGuest: true,
                      onGuestContinue: () => setGuestChosen(true),
                    })
                  }
                >
                  <strong>Sign In / Create Account</strong>
                  <span>Track this order from your account</span>
                </button>
              </div>
            </section>
          ) : (
            <section className={styles.detailsSection} aria-labelledby="details-heading">
              <h2 id="details-heading">Shipping &amp; contact details</h2>
              {!isSignedIn && <p className={styles.sectionSub}>Checking out as a guest.</p>}
              <form className={styles.form} onSubmit={handlePlaceOrder}>
                <label htmlFor="fullName" className={styles.formLabel}>
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  defaultValue={user?.name ?? ""}
                  className={styles.formInput}
                />

                <label htmlFor="email" className={styles.formLabel}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  defaultValue={user?.email ?? ""}
                  className={styles.formInput}
                />

                <label htmlFor="address" className={styles.formLabel}>
                  Street address
                </label>
                <input id="address" name="address" type="text" required className={styles.formInput} />

                <div className={styles.formRow}>
                  <div>
                    <label htmlFor="city" className={styles.formLabel}>
                      City
                    </label>
                    <input id="city" name="city" type="text" required className={styles.formInput} />
                  </div>
                  <div>
                    <label htmlFor="country" className={styles.formLabel}>
                      Country
                    </label>
                    <input id="country" name="country" type="text" required className={styles.formInput} />
                  </div>
                </div>

                <p className={styles.note}>
                  Prototype — no payment step exists yet; placing this order just clears your cart and shows a mock
                  confirmation.
                </p>

                <button type="submit" className={styles.placeOrderBtn}>
                  Place Order — {formatPrice(subtotal)}
                </button>
              </form>
            </section>
          )}
        </div>

        <aside className={styles.summaryCol} aria-label="Order summary">
          <h2 className={styles.summaryTitle}>Order summary</h2>
          <ul className={styles.summaryList}>
            {rows.map(({ item, product, lineTotal }) => (
              <li key={item.productId} className={styles.summaryItem}>
                <span>
                  {product.name} <span className={styles.summaryQty}>× {item.quantity}</span>
                </span>
                <span>{formatPrice(lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className={styles.summaryDivider} />
          <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
