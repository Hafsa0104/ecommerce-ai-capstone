// app/sitemap-index/page.tsx — a real, human-readable site index: every
// actual page/action on TradeHub in one place, grouped by what a
// visitor is trying to DO (shop, manage their account, get help) rather
// than by site structure. Linked from the footer's bottom bar. Named
// "sitemap-index" rather than "/sitemap" specifically to not collide
// with app/sitemap.ts, which is a Next.js convention that reserves
// /sitemap.xml (the machine-readable version, for search engines —
// see that file's own comment). Every href below is a route that
// genuinely exists elsewhere in this app; nothing here is a placeholder.
import type { Metadata } from "next";
import Link from "next/link";
import {
  Compass,
  Tag,
  TrendingUp,
  Grid3x3,
  UserCircle2,
  Package,
  Heart,
  ShoppingCart,
  MessageCircle,
  LifeBuoy,
  Info,
} from "lucide-react";
import { CATEGORY_LABELS } from "@/services/productData";
import type { CategoryKey } from "@/types/product";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Sitemap",
  description: "Every page on TradeHub in one place — shop by category, manage your account, or get help.",
};

const CATEGORY_ENTRIES = Object.entries(CATEGORY_LABELS) as [CategoryKey, string][];

interface SiteLink {
  href: string;
  label: string;
}

interface SiteSection {
  heading: string;
  icon: typeof Compass;
  links: SiteLink[];
}

const SECTIONS: SiteSection[] = [
  {
    heading: "Shop",
    icon: Compass,
    links: [
      { href: "/", label: "Home" },
      { href: "/listing", label: "All products" },
      { href: "/listing?deals=1", label: "Deals" },
      { href: "/listing?sort=trending", label: "Trending" },
    ],
  },
  {
    heading: "Your account",
    icon: UserCircle2,
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: "/sign-up", label: "Create account" },
      { href: "/profile", label: "My profile" },
      { href: "/profile#orders", label: "My orders" },
      { href: "/wishlist", label: "Wishlist" },
      { href: "/cart", label: "Cart" },
      { href: "/messages", label: "Messages" },
    ],
  },
  {
    heading: "Help & support",
    icon: LifeBuoy,
    links: [
      { href: "/support", label: "Help center" },
      { href: "/support#getting-started", label: "Getting started" },
      { href: "/support#shipping", label: "Shipping info" },
      { href: "/support#returns", label: "Returns & refunds" },
      { href: "/support#contact", label: "Contact us" },
    ],
  },
  {
    heading: "Company",
    icon: Info,
    links: [{ href: "/about", label: "About us" }],
  },
];

export default function SitemapIndexPage() {
  return (
    <div className={`wrap ${styles.pageContainer}`}>
      <h1 className={styles.title}>Sitemap</h1>
      <p className={styles.intro}>Every page on TradeHub, grouped by what you&apos;re trying to do.</p>

      <div className={styles.sectionGrid}>
        {SECTIONS.map((section) => (
          <nav key={section.heading} aria-label={section.heading} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <section.icon size={18} aria-hidden="true" />
              {section.heading}
            </h2>
            <ul className={styles.list}>
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <nav aria-label="Browse by category" className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Grid3x3 size={18} aria-hidden="true" />
            Browse by category
          </h2>
          <ul className={styles.list}>
            {CATEGORY_ENTRIES.map(([key, label]) => (
              <li key={key}>
                <Link href={`/listing?category=${key}`}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Quick-action row for the four things a returning shopper does
          most — same destinations as above, just surfaced without
          needing to scan a whole section for them. */}
      <div className={styles.quickLinks}>
        <Link href="/listing?deals=1" className={styles.quickLink}>
          <Tag size={18} aria-hidden="true" />
          Deals
        </Link>
        <Link href="/listing?sort=trending" className={styles.quickLink}>
          <TrendingUp size={18} aria-hidden="true" />
          Trending
        </Link>
        <Link href="/wishlist" className={styles.quickLink}>
          <Heart size={18} aria-hidden="true" />
          Wishlist
        </Link>
        <Link href="/cart" className={styles.quickLink}>
          <ShoppingCart size={18} aria-hidden="true" />
          Cart
        </Link>
        <Link href="/profile#orders" className={styles.quickLink}>
          <Package size={18} aria-hidden="true" />
          My orders
        </Link>
        <Link href="/messages" className={styles.quickLink}>
          <MessageCircle size={18} aria-hidden="true" />
          Messages
        </Link>
      </div>
    </div>
  );
}
