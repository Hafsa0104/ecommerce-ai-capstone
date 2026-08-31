// components/ProductCard.tsx — reusable product card used on Home,
// Listing, and recommendation rails. Real <article>/<a>, explicit
// image dimensions (no CLS), lazy-loaded by default.
import Image from "next/image";
import Link from "next/link";
import { Star, ShieldCheck, TrendingUp } from "lucide-react";
import type { Product } from "@/types/product";
import { isDealProduct } from "@/services/productService";
import WishlistButton from "./WishlistButton";
import PriceDisplay from "./PriceDisplay";
import styles from "./ProductCard.module.css";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  // Opt-in, not derived here: "trending" is a catalog-wide ranking (top
  // orders — see getTrendingProductIds), not a fact about one product in
  // isolation, so whoever's rendering a *list* decides which of its own
  // items qualify. Only the listing page passes this today; every other
  // caller (Home, recommendations) is unaffected by leaving it unset.
  isTrending?: boolean;
}

export default function ProductCard({ product, priority = false, isTrending = false }: ProductCardProps) {
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;
  // The existing Deals filter already treats "hot" as a deal signal on
  // its own, with no discount required — but until now the only visual
  // cue on a card was the discount percentage, so a hot-but-not-marked-
  // down product qualified for the filter yet showed no badge at all.
  // Falling back to a plain "Deal" label closes that gap using the same
  // rule the filter already applies, not a new one.
  const isDeal = isDealProduct(product);

  return (
    <article className={styles.card}>
      <Link href={`/product/${product.id}`} className={styles.imageLink}>
        <div className={styles.imageWrap}>
          <Image
            src={product.img}
            alt={product.name}
            width={280}
            height={280}
            // ProductCard.module.css renders this at width:100%/height:100%
            // inside a repeat(auto-fill, minmax(13rem, 1fr)) grid, not at
            // the fixed 280px declared above — without `sizes`, next/image
            // only generates a 1x/2x srcset off that 280px number, so on a
            // wide screen (fewer, wider columns) or a high-DPI display the
            // browser has no correctly-sized candidate and upscales a too-
            // small one, which is what was actually causing the blur.
            // These breakpoints mirror the grid's real column count: one
            // column under 30rem, ~2 under 48rem, ~3 under 75rem, ~4+ above.
            sizes="(max-width: 30rem) 100vw, (max-width: 48rem) 50vw, (max-width: 75rem) 33vw, 25vw"
            className={styles.image}
            loading={priority ? undefined : "lazy"}
            priority={priority}
          />
          {discount !== null ? (
            <span className={styles.discountBadge} title="Discounted from the catalog's listed price">
              -{discount}%
            </span>
          ) : (
            isDeal && (
              <span className={styles.discountBadge} title="Flagged as a deal in the product catalog">
                Deal
              </span>
            )
          )}
          {isTrending && (
            <span className={styles.trendingBadge} title="Among the catalog's most-ordered products">
              <TrendingUp size={12} aria-hidden="true" />
              Trending
            </span>
          )}
        </div>
      </Link>

      {/* Sibling of the image Link, not nested inside it — a <button>
          can't legally nest inside an <a>, and WishlistButton's own
          click handler already stops propagation so this being visually
          on top of the image (via .compactBtn's absolute positioning)
          doesn't also trigger the link underneath it. */}
      <WishlistButton productId={product.id} productName={product.name} variant="compact" />
      <div className={styles.body}>
        <Link href={`/product/${product.id}`} className={styles.name}>
          {product.name}
        </Link>
        <div className={styles.priceRow}>
          <span className={styles.price}>
            <PriceDisplay amountUsd={product.price} />
          </span>
          {product.oldPrice && (
            <span className={styles.oldPrice}>
              <PriceDisplay amountUsd={product.oldPrice} />
            </span>
          )}
        </div>
        <div className={styles.meta}>
          <span className={styles.rating}>
            <Star size={14} aria-hidden="true" fill="currentColor" />
            <span className="sr-only">Rating:</span> {product.rating}
          </span>
          <span aria-hidden="true">·</span>
          <span>{product.orders} orders</span>
        </div>
        {product.verified && (
          <span className={styles.verified} title="Verification status recorded in the product catalog">
            <ShieldCheck size={14} aria-hidden="true" />
            Verified supplier
          </span>
        )}
      </div>
    </article>
  );
}
