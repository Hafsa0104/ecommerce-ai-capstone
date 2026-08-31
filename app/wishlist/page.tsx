"use client";

// app/wishlist/page.tsx — mirrors app/cart/page.tsx's structure (client
// component, no SEO value, personal per-user data). Wishlist is one of
// this app's account-gated features (see AuthContext) — signed out,
// this shows a sign-in prompt rather than local wishlist data, keeping
// the feature consistently "an account thing" everywhere it appears,
// not just at the moment of adding an item.
import Link from "next/link";
import { Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { useWishlist } from "@/context/WishlistContext";
import { getProductById } from "@/services/productService";
import ProductCard from "@/components/ProductCard";
import styles from "./page.module.css";

export default function WishlistPage() {
  const { isSignedIn } = useAuth();
  const { requestAuth } = useAuthModal();
  const { productIds } = useWishlist();

  if (!isSignedIn) {
    return (
      <div className={`wrap ${styles.pageContainer}`}>
        <h1 className={styles.title}>My Wishlist</h1>
        <div className={styles.emptyState} role="status">
          <Heart size={40} aria-hidden="true" />
          <p>Sign in to see the items you&apos;ve saved.</p>
          <button type="button" className={styles.signInBtn} onClick={() => requestAuth()}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const products = productIds.map((id) => getProductById(id)).filter((p): p is NonNullable<typeof p> => p !== null);

  if (products.length === 0) {
    return (
      <div className={`wrap ${styles.pageContainer}`}>
        <h1 className={styles.title}>My Wishlist</h1>
        <div className={styles.emptyState} role="status">
          <Heart size={40} aria-hidden="true" />
          <p>Nothing saved yet.</p>
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
        My Wishlist <span className={styles.titleCount}>({products.length})</span>
      </h1>
      {/* Tap the heart on any card again to remove it — WishlistButton
          (inside ProductCard) already toggles saved state, so no
          separate "Remove" control is needed here. */}
      <div className={styles.productGrid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
