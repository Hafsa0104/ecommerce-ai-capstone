// app/sitemap.ts — Next.js's built-in sitemap convention: this file
// alone makes /sitemap.xml exist, listing every real, indexable page —
// static routes, every category listing, and every product detail page
// (from the actual catalog, not a guessed count). Complements the
// human-readable /sitemap page (see app/sitemap-index) linked from the
// footer: that one is for a visitor to click through, this one is for
// search engines, and Next.js reserves the URL /sitemap for a page
// route, so the machine-readable one can only live at the framework's
// own /sitemap.xml.
import type { MetadataRoute } from "next";
import { PRODUCTS, CATEGORY_LABELS } from "@/services/productData";
import type { CategoryKey } from "@/types/product";

const SITE_URL = "https://tradehub-example.vercel.app";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/listing", priority: 0.8, changeFrequency: "daily" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/support", priority: 0.6, changeFrequency: "monthly" },
  { path: "/sitemap-index", priority: 0.3, changeFrequency: "monthly" },
  { path: "/sign-in", priority: 0.3, changeFrequency: "yearly" },
  { path: "/sign-up", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = (Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((key) => ({
    url: `${SITE_URL}/listing?category=${key}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = PRODUCTS.map((p) => ({
    url: `${SITE_URL}/product/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
