// components/Footer.tsx — static site footer, no client JS needed.
// Reorganized around what a visitor is trying to DO (get started, shop,
// get support) rather than an arbitrary "Company" grab-bag — every link
// here also appears, grouped the same way, on the fuller /sitemap-index
// page (linked from the bottom bar), which exists specifically so
// nothing on the site is more than one click from a real destination.
// "Getting started" previously had no footer entry at all despite
// app/support/page.tsx already having a real #getting-started section
// to link to; "Contact us" previously sat alone under "Company" instead
// of with the rest of the support topics a buyer would look for it
// alongside — both fixed here.
import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.grid}`}>
        <div>
          <p className={styles.brand}>TradeHub</p>
          <p className={styles.tagline}>Sourcing and wholesale, simplified.</p>
        </div>

        <nav aria-label="Get started">
          <h2 className={styles.heading}>Get started</h2>
          <ul className={styles.list}>
            <li>
              <Link href="/support#getting-started">Getting started</Link>
            </li>
            <li>
              <Link href="/sign-up">Create account</Link>
            </li>
            <li>
              <Link href="/sign-in">Sign in</Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Shopping">
          <h2 className={styles.heading}>Shopping</h2>
          <ul className={styles.list}>
            <li>
              <Link href="/listing">Browse categories</Link>
            </li>
            <li>
              <Link href="/support#shipping">Shipping info</Link>
            </li>
            <li>
              <Link href="/profile#orders">Track my orders</Link>
            </li>
            <li>
              <Link href="/cart">My cart</Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Support and company">
          <h2 className={styles.heading}>Support</h2>
          <ul className={styles.list}>
            <li>
              <Link href="/support#returns">Returns &amp; refunds</Link>
            </li>
            <li>
              <Link href="/support#contact">Contact us</Link>
            </li>
            <li>
              <Link href="/support">Help center</Link>
            </li>
            <li>
              <Link href="/about">About us</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className={`wrap ${styles.bottomBar}`}>
        <p className={styles.copyright}>&copy; {new Date().getFullYear()} TradeHub. All rights reserved.</p>
        {/* The full, categorized index every link above is drawn from —
            one place that lists literally every real page on the site,
            for anyone who didn't find what they wanted in these four
            columns. */}
        <Link href="/sitemap-index" className={styles.sitemapLink}>
          Sitemap
        </Link>
      </div>
    </footer>
  );
}
