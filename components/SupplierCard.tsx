"use client";

// components/SupplierCard.tsx — client component so it can react to
// the "Deliver to" selection. The product page stays a static/SSG
// server component for SEO; this is the one piece that needs to be
// interactive, following the same split used for the purchase panel.
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Globe2 } from "lucide-react";
import { useShipCountry, SHIP_COUNTRIES } from "@/context/ShipCountryContext";
import { getSupplierForProduct } from "@/services/productService";
import type { Product } from "@/types/product";
import styles from "@/app/product/[id]/page.module.css";

export default function SupplierCard({ product }: { product: Product }) {
  const { shipCountry } = useShipCountry();
  const supplier = getSupplierForProduct(product, shipCountry);
  // Reuses SHIP_COUNTRIES' own per-flag real dimensions (see its
  // comment) instead of a second hardcoded width/height guess here —
  // same flag files, same varying aspect ratios, so a mismatched pair
  // would trigger next/image's aspect-ratio warning the same way it
  // did before that file was fixed.
  const flagDims = SHIP_COUNTRIES.find((c) => c.value === supplier.country);

  return (
    <aside className={styles.supplierCard} aria-label="Supplier information">
      <div className={styles.supplierHeader}>
        <div className={styles.supplierLogo} style={{ background: supplier.color }} aria-hidden="true">
          {supplier.initial}
        </div>
        <div>
          <strong className={styles.supplierLabel}>Supplier</strong>
          <p className={styles.supplierName}>{supplier.name}</p>
        </div>
      </div>
      <hr className={styles.supplierDivider} />
      <div className={styles.supplierInfo}>
        <p>
          <Image
            src={supplier.flag}
            alt=""
            width={flagDims?.flagWidth ?? 28}
            height={flagDims?.flagHeight ?? 20}
            style={{ height: "14px", width: "auto" }}
          />
          {supplier.country}, {supplier.city}
        </p>
        {supplier.verified && (
          <p>
            <ShieldCheck size={16} aria-hidden="true" /> Verified seller, {supplier.years}+ years
          </p>
        )}
        <p>
          <Globe2 size={16} aria-hidden="true" /> Ships to {shipCountry}
        </p>
      </div>
      {/* Carries which supplier AND which product this actually was —
          without the supplier param, every "Send inquiry" click landed
          on the same generic /messages inbox with whichever
          conversation happened to be first; without the product param,
          the thread opened with no idea what the shopper was actually
          asking about. Messages page picks both up (see its own
          effect) — opens that supplier's thread pre-filled with a
          message naming this specific product. */}
      <Link
        href={`/messages?supplier=${encodeURIComponent(supplier.name)}&product=${encodeURIComponent(product.id)}`}
        className={styles.sendBtn}
      >
        Send inquiry
      </Link>
      <Link href={`/listing?category=${product.category}`} className={styles.profileBtn}>
        More from this category
      </Link>
    </aside>
  );
}
