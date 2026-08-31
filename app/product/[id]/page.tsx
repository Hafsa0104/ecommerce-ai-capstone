import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, CheckCircle2 } from "lucide-react";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import ProductCard from "@/components/ProductCard";
import SupplierCard from "@/components/SupplierCard";
import WishlistButton from "@/components/WishlistButton";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import CustomizationRequestDialog from "@/components/CustomizationRequestDialog";
import SpecInfoDialog from "@/components/SpecInfoDialog";
import ReviewCard from "@/components/ReviewCard";
import {
  getProductById,
  getAllProducts,
  getSpecs,
  getPriceTiers,
  getReviews,
  getReviewCount,
  getGallery,
  getRecommendations,
} from "@/services/productService";
import { CATEGORY_LABELS } from "@/services/productData";
import styles from "./page.module.css";

// The catalog is static, so every product page is pre-built at deploy
// time (SSG) and silently regenerated in the background afterward.
export const revalidate = 3600;

export async function generateStaticParams() {
  return getAllProducts().map((p) => ({ id: p.id }));
}

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: "Product not found" };

  const title = product.name;
  const description = product.desc.slice(0, 155);

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.id}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: product.img }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const specs = getSpecs(product);
  const priceTiers = getPriceTiers(product);
  const reviews = getReviews(product);
  const reviewCount = getReviewCount(product);
  const gallery = getGallery(product);
  const recommendations = getRecommendations(product, 5);

  const SITE_URL = "https://tradehub-example.vercel.app";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [`${SITE_URL}${product.img}`],
    description: product.desc,
    brand: { "@type": "Brand", name: product.brand },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: product.price,
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/product/${product.id}`,
    },
  };

  return (
    <div className={`wrap ${styles.pageContainer}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <ol>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href={`/listing?category=${product.category}`}>{CATEGORY_LABELS[product.category]}</Link>
          </li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <div className={styles.topGrid}>
        {/* Wrapper only gives the gallery a sticky positioning hook
            (ProductGallery takes no className prop) — it stays the
            first child of .topGrid, in the same first column, exactly
            as before. See .gallerySticky in page.module.css. */}
        <div className={styles.gallerySticky}>
          <ProductGallery images={gallery} productName={product.name} />
        </div>

        <div className={styles.info}>
          <p className={styles.stock}>
            <CheckCircle2 size={16} aria-hidden="true" />
            In stock
          </p>
          {/* Same WishlistButton/WhatsAppShareButton already used in
              ProductPurchasePanel's own actions row below — added here
              too, not moved, per the reference layout (title row, top
              right) this was asked to match. */}
          <div className={styles.titleRow}>
            <h1 className={styles.name}>{product.name}</h1>
            <div className={styles.titleActions}>
              <WhatsAppShareButton productName={product.name} />
              <WishlistButton productId={product.id} productName={product.name} variant="icon" />
            </div>
          </div>
          {/* Real, visible confirmation of which brand this product is —
              product.brand was only ever in the invisible JSON-LD before,
              so a shopper had no way to see it or filter by it. Links
              into the same Brand filter FilterSidebar now exposes. */}
          <p className={styles.brandLine}>
            Brand:{" "}
            <Link href={`/listing?brand=${encodeURIComponent(product.brand)}`} className={styles.brandLink}>
              {product.brand}
            </Link>
          </p>
          <div className={styles.ratingRow}>
            <span className={styles.stars}>
              <Star size={16} aria-hidden="true" fill="currentColor" />
              <span className="sr-only">Rating:</span> {product.rating}
            </span>
            <span aria-hidden="true">|</span>
            <span>{reviewCount} reviews</span>
            <span aria-hidden="true">|</span>
            <span>{product.orders} sold</span>
          </div>

          <ProductPurchasePanel productId={product.id} productName={product.name} priceTiers={priceTiers} />

          <section className={styles.specSection} aria-labelledby="spec-heading">
            <h2 id="spec-heading" className={styles.specHeading}>
              Specification
            </h2>
            {/* One disclosure line for the whole section rather than one
                per row (Type/Material/Design/Customization/Protection/
                Warranty are all the same category-level catalog text,
                not per-product verified facts or platform guarantees —
                see getSpecs() and CATEGORY_SPEC_DEFAULTS in
                productService/productData). Price used to be a row here
                too ("Negotiable", with no action behind it) — the real
                price and the real negotiation action (Request a Quote)
                now live together in the purchase panel above instead. */}
            <p className={styles.sectionSub}>Details provided by the product listing.</p>
            <table className={styles.specTable}>
              <tbody>
                {Object.entries(specs).map(([key, value]) => (
                  <tr key={key}>
                    <td className={styles.specKey}>{key.charAt(0).toUpperCase() + key.slice(1)}</td>
                    <td>
                      {value}
                      {/* Customization/Protection/Warranty are supplier-
                          dependent policies, not something this app
                          manages — each gets a real action instead of
                          sitting as an unactionable claim: a prototype
                          request form for Customization (see
                          CustomizationRequestDialog), and a plain-
                          language explanation dialog for Protection/
                          Warranty (see SpecInfoDialog) that's honest
                          about what is and isn't verified here. Type/
                          Material/Design stay plain text — they're
                          descriptive facts, not policies to act on. */}
                      {key === "customization" && (
                        <div className={styles.specAction}>
                          <CustomizationRequestDialog productName={product.name} customizationText={value} />
                        </div>
                      )}
                      {key === "protection" && (
                        <div className={styles.specAction}>
                          <SpecInfoDialog triggerLabel="View protection terms" title="Buyer Protection">
                            <p>The product is covered according to the protection policy shown for this listing.</p>
                            <p>
                              <strong>Protection:</strong> {value}
                            </p>
                            <p>
                              <strong>Important:</strong> Return, refund, and warranty eligibility are subject to
                              the supplier/manufacturer terms.
                            </p>
                          </SpecInfoDialog>
                        </div>
                      )}
                      {key === "warranty" && (
                        <div className={styles.specAction}>
                          <SpecInfoDialog triggerLabel="View warranty terms" title="Warranty">
                            <p>
                              <strong>Warranty period:</strong> {value}
                            </p>
                            <p>
                              <strong>Coverage:</strong> Manufacturer defects, subject to supplier/manufacturer
                              terms.
                            </p>
                            <p>
                              <strong>Important:</strong> Warranty terms may vary by supplier and product.
                            </p>
                          </SpecInfoDialog>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <SupplierCard product={product} />
      </div>

      <section className={styles.reviewsSection} aria-labelledby="reviews-heading">
        <h2 id="reviews-heading">Customer reviews</h2>
        <ul className={styles.reviewList}>
          {reviews.map((review, i) => (
            // Reviews are generated deterministically from REVIEW_TEMPLATES
            // in the same fixed order every time (see getReviews) — index
            // is a stable id across reloads for this product, which is
            // what ReviewCard needs to persist "helpful" votes per review.
            <ReviewCard key={i} reviewId={`${product.id}-review-${i}`} stars={review.stars} text={review.text} />
          ))}
        </ul>
      </section>

      {recommendations.length > 0 && (
        <section className={styles.recommendations} aria-labelledby="recommendations-heading">
          <div className={styles.sectionHeader}>
            <h2 id="recommendations-heading">You may also like</h2>
            <p className={styles.sectionSub}>Matched to this product&apos;s category, brand, and features</p>
          </div>
          <div className={styles.productGrid}>
            {recommendations.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
