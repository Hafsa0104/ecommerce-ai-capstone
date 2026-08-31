"use client";

// app/cart/page.tsx — cart contents only exist client-side (in
// localStorage via CartContext), so this whole page is a client
// component. No SEO value here (it's personal, per-user data behind
// no meaningful public content), so client rendering is the right
// choice, not a compromise — this mirrors the CSR/SSR/ISR guidance
// from the mentor's reference examples: use CSR for personalized,
// non-indexable pages.
import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { getProductById, getPriceTiers } from "@/services/productService";
import styles from "./page.module.css";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { formatPrice } = useCurrency();

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
  const totalItems = rows.reduce((sum, r) => sum + r.item.quantity, 0);

  if (rows.length === 0) {
    return (
      <div className={`wrap ${styles.pageContainer}`}>
        <h1 className={styles.title}>My Cart</h1>
        <div className={styles.emptyState} role="status">
          <ShoppingBag size={40} aria-hidden="true" />
          <p>Your cart is empty.</p>
          <Link href="/listing" className={styles.browseLink}>
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`wrap ${styles.pageContainer}`}>
      <h1 className={styles.title}>
        My Cart <span className={styles.titleCount}>({totalItems})</span>
      </h1>

      <div className={styles.layout}>
        <div className={styles.itemsCol}>
          <ul className={styles.itemList}>
            {rows.map(({ item, product, unitPrice, lineTotal }) => (
              <li key={item.productId} className={styles.item}>
                <Link href={`/product/${product.id}`} className={styles.itemImageLink}>
                  <Image
                    src={product.img}
                    alt={product.name}
                    width={96}
                    height={96}
                    className={styles.itemImage}
                  />
                </Link>

                <div className={styles.itemInfo}>
                  <Link href={`/product/${product.id}`} className={styles.itemName}>
                    {product.name}
                  </Link>
                  <p className={styles.itemUnitPrice}>{formatPrice(unitPrice)} / unit</p>

                  <div className={styles.itemButtons}>
                    <div className={styles.qtyControl}>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        aria-label={`Decrease quantity of ${product.name}`}
                      >
                        −
                      </button>
                      <label htmlFor={`qty-${item.productId}`} className="sr-only">
                        Quantity for {product.name}
                      </label>
                      <input
                        id={`qty-${item.productId}`}
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.productId, Math.max(1, Number(e.target.value) || 1))
                        }
                        className={styles.qtyInput}
                      />
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        aria-label={`Increase quantity of ${product.name}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </div>

                <p className={styles.itemLineTotal}>{formatPrice(lineTotal)}</p>
              </li>
            ))}
          </ul>

          <div className={styles.footerButtons}>
            <Link href="/listing" className={styles.continueLink}>
              Continue shopping
            </Link>
            <button type="button" className={styles.clearBtn} onClick={clearCart}>
              Clear cart
            </button>
          </div>
        </div>

        <aside className={styles.summaryCol} aria-label="Order summary">
          <h2 className={styles.summaryTitle}>Order summary</h2>
          <dl className={styles.summaryRow}>
            <dt>
              Items ({totalItems}) subtotal
            </dt>
            <dd>{formatPrice(subtotal)}</dd>
          </dl>
          <dl className={styles.summaryRow}>
            <dt>Shipping</dt>
            <dd>Calculated at checkout</dd>
          </dl>
          <div className={styles.summaryDivider} />
          <dl className={`${styles.summaryRow} ${styles.summaryTotal}`}>
            <dt>Total</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </dl>
          <Link href="/checkout" className={styles.checkoutBtn}>
            Checkout
          </Link>
          <p className={styles.summaryNote}>Checkout isn&apos;t wired to a real payment provider in this demo.</p>
        </aside>
      </div>
    </div>
  );
}
