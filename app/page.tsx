import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import HomeUserCard from "@/components/HomeUserCard";
import { PRODUCTS, CATEGORY_LABELS } from "@/services/productData";
import type { CategoryKey } from "@/types/product";
import styles from "./page.module.css";

// Product catalog doesn't change second-to-second — cache the page
// and silently regenerate it in the background once an hour (ISR).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Wholesale marketplace for verified suppliers | TradeHub",
  description:
    "Browse automobiles, tech, home interiors, tools, and more from verified suppliers. Compare prices, order in bulk, and get AI-matched recommendations.",
  alternates: { canonical: "/" },
};

const CATEGORY_ENTRIES = Object.entries(CATEGORY_LABELS) as [CategoryKey, string][];

const CATEGORY_TILE_IMAGE: Record<CategoryKey, string> = {
  automobiles: "/images/automobile/dash-car-camera.webp",
  "clothes-and-wear": "/images/cloth/image 24.webp",
  "home-interiors": "/images/interior/standing-desk.webp",
  "computer-and-tech": "/images/tech/laptop.webp",
  "tools-equipments": "/images/tools/cordless-drill-set.webp",
  "sports-and-outdoor": "/images/sports/water-bottle.webp",
  "animal-and-pets": "/images/animals/dog-leash.webp",
  "machinery-tools": "/images/tools/angle-grinder.webp",
  "gift-boxes": "/images/interior/gift-surprise.webp",
};

export default function Home() {
  const dealProducts = PRODUCTS.filter((p) => p.hot).slice(0, 5);
  const trending = [...PRODUCTS].sort((a, b) => b.orders - a.orders).slice(0, 10);

  return (
    <div className={styles.pageContainer}>
      {/* ── TOP: sidebar + hero + promo panel ───────────────────── */}
      <div className={`wrap ${styles.topGrid}`}>
        <aside className={styles.sidebar} aria-label="Browse categories">
          <ul className={styles.sidebarList}>
            {CATEGORY_ENTRIES.map(([key, label]) => (
              <li key={key}>
                <Link href={`/listing?category=${key}`} className={styles.sidebarItem}>
                  {label}
                  <ChevronRight size={14} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <section className={styles.hero} aria-labelledby="hero-heading">
          <Image
            src="/images/background/Banner-board-800x420 2.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 56rem) 100vw, 50vw"
            className={styles.heroImage}
          />
          <div className={styles.heroText}>
            <p className={styles.heroKicker}>Latest trending</p>
            <h1 id="hero-heading">Electronic items</h1>
            <Link href="/listing?category=computer-and-tech" className={styles.heroBtn}>
              Learn more
            </Link>
          </div>
        </section>

        <aside className={styles.rightPanel} aria-label="Account and promotions">
          <HomeUserCard />
          <div className={`${styles.promoBanner} ${styles.promoOrange}`}>
            <p>Get US $10 off with a new supplier</p>
          </div>
          <div className={`${styles.promoBanner} ${styles.promoTeal}`}>
            <p>Send quotes with supplier preferences</p>
          </div>
        </aside>
      </div>

      {/* ── DEALS ────────────────────────────────────────────────── */}
      <section className={`wrap ${styles.section}`} aria-labelledby="deals-heading">
        <div className={styles.sectionHeader}>
          <h2 id="deals-heading">Deals and offers</h2>
          <p className={styles.sectionSub}>Hand-picked discounts, updated regularly</p>
        </div>
        <div className={styles.productGrid}>
          {/* .productGrid's columns (13rem min) fit multiple cards in
              this row on typical desktop widths — the first row sits
              above the fold together, not just its first card, so a
              second card here (e.g. the Smart watches card) was still
              being measured as the page's actual Largest Contentful
              Paint element without `priority`, triggering next/image's
              LCP warning. Kept to the first two (not the whole row) —
              enough to cover what's reliably above the fold without
              making the rest of this row eager too. */}
          {dealProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* ── CATEGORY GRID ────────────────────────────────────────── */}
      <section className={`wrap ${styles.section}`} aria-labelledby="categories-heading">
        <div className={styles.sectionHeader}>
          <h2 id="categories-heading">Browse by category</h2>
        </div>
        <div className={styles.categoryGrid}>
          {CATEGORY_ENTRIES.map(([key, label]) => (
            <Link key={key} href={`/listing?category=${key}`} className={styles.categoryTile}>
              <div className={styles.categoryTileImageWrap}>
                <Image
                  src={CATEGORY_TILE_IMAGE[key]}
                  alt=""
                  width={96}
                  height={96}
                  loading="lazy"
                  className={styles.categoryTileImage}
                />
              </div>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TRENDING ─────────────────────────────────────────────── */}
      <section className={`wrap ${styles.section}`} aria-labelledby="trending-heading">
        <div className={styles.sectionHeader}>
          <h2 id="trending-heading">Trending now</h2>
          <p className={styles.sectionSub}>Most-ordered products across all categories</p>
        </div>
        <div className={styles.productGrid}>
          {trending.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
