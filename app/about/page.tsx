// app/about/page.tsx — server-rendered static content, linked from
// the site footer's "About us" link (see Footer.tsx), which
// previously pointed at /about with no page behind it — a real 404.
// Stats below are computed from the actual catalog data, not invented
// numbers — same "real, computed count" principle AuthSplitPage
// already applies to its own category counts.
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Layers, Globe2, MessageSquare } from "lucide-react";
import { PRODUCTS, CATEGORY_LABELS } from "@/services/productData";
// Imported from the plain data file, not "@/context/ShipCountryContext"
// (which re-exports the same array) — that module has "use client" at
// the top, and a Server Component importing a plain data export
// through that boundary doesn't resolve to the real array. See
// shipCountriesData.ts's own comment.
import { SHIP_COUNTRIES } from "@/context/shipCountriesData";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "About us",
  description: "About TradeHub — a wholesale marketplace connecting buyers with verified suppliers.",
};

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Verified suppliers",
    body: "Every supplier panel shows how long they've been verified on the marketplace, so you know who you're ordering from.",
  },
  {
    icon: Layers,
    title: "Tiered bulk pricing",
    body: "Prices step down automatically as your order quantity goes up — the tier you qualify for is highlighted on every listing.",
  },
  {
    icon: Globe2,
    title: "Multiple ship-to countries",
    body: "Switch your delivery country from the header and see the actual supplier who ships there for each product.",
  },
  {
    icon: MessageSquare,
    title: "Direct supplier messaging",
    body: "Send an inquiry straight from a product page — it opens a real conversation thread about that specific item.",
  },
];

export default function AboutPage() {
  const categoryCount = Object.keys(CATEGORY_LABELS).length;
  const countryCount = SHIP_COUNTRIES.length;
  const productCount = PRODUCTS.length;

  return (
    <div className={`wrap ${styles.pageContainer}`}>
      <h1 className={styles.title}>About TradeHub</h1>
      <p className={styles.lead}>
        TradeHub connects buyers with verified suppliers across automobiles, tech, home, tools, and more — browse,
        compare, and order in bulk with confidence.
      </p>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{productCount}+</span>
          <span className={styles.statLabel}>Products listed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{categoryCount}</span>
          <span className={styles.statLabel}>Categories</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{countryCount}</span>
          <span className={styles.statLabel}>Ship-to countries</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>What we offer</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <f.icon size={22} aria-hidden="true" className={styles.featureIcon} />
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <p className={styles.demoNotice}>
        This is a frontend prototype built to demonstrate the marketplace experience end to end — browsing,
        ordering, messaging, and account features are all real and interactive, but there is no live payment
        provider or order-fulfillment backend behind them.
      </p>

      <div className={styles.ctaRow}>
        <Link href="/listing" className={styles.primaryLink}>
          Browse products
        </Link>
        <Link href="/support" className={styles.secondaryLink}>
          Visit help center
        </Link>
      </div>
    </div>
  );
}
