// app/support/page.tsx — Help center: server-rendered static content
// (no client state needed), linked from the site footer's "Help
// center" / "Returns & refunds" / "Shipping info" / "Contact us"
// links (see Footer.tsx). Those previously pointed at /support and
// /support#returns/#shipping/#contact with no page behind them at
// all — real 404s. This is that page, with a real section (and a
// real #id) behind every one of those links, using the browser's own
// native anchor scrolling (no client JS needed for that part).
import type { Metadata } from "next";
import Link from "next/link";
import {
  Truck,
  RotateCcw,
  Mail,
  MessageCircle,
  Grid3x3,
  ShoppingCart,
  LogIn,
  UserPlus,
  MapPin,
  Package,
} from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Help center",
  description: "Shipping, returns, and contact information for TradeHub.",
};

const TOC = [
  { href: "#getting-started", label: "Getting started" },
  { href: "#shipping", label: "Shipping info" },
  { href: "#returns", label: "Returns & refunds" },
  { href: "#contact", label: "Contact us" },
];

interface QuickAction {
  href: string;
  label: string;
  icon: typeof Grid3x3;
}

// A distinct row of real buttons after each section's prose, not links
// woven into the sentences themselves — mid-sentence links for every
// mentioned action read as visual noise and made the paragraph itself
// harder to read as plain prose. This keeps the explanation and the
// "go do it" action clearly separate: read the policy, then act on it
// via an unambiguous, deliberately-placed control — the same
// "obviously a control" contract that button-styled quick actions
// elsewhere in this app (e.g. the /sitemap-index page's own row) rely
// on to read as different from the surrounding text.
function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className={styles.quickActions}>
      {actions.map((action) => (
        <Link key={action.href} href={action.href} className={styles.quickActionBtn}>
          <action.icon size={16} aria-hidden="true" />
          {action.label}
        </Link>
      ))}
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className={`wrap ${styles.pageContainer}`}>
      <h1 className={styles.title}>Help center</h1>
      <p className={styles.intro}>
        Answers to the most common questions about ordering, shipping, and returns on this marketplace.
      </p>

      <p className={styles.demoNotice}>
        This is a demo storefront with no order-fulfillment or support backend — the policies below are
        illustrative examples written for this prototype, not commitments a real order here would be bound by.
      </p>

      <nav aria-label="Help center sections" className={styles.toc}>
        <ul className={styles.tocList}>
          {TOC.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="getting-started" className={styles.section}>
        <h2 className={styles.sectionTitle}>Getting started</h2>
        <div className={styles.sectionBody}>
          <p>
            Browse by category from the menu, or search for a product directly. Every listing shows tiered
            pricing by order quantity — the more you order, the lower the per-unit price. Add items to your cart
            and check out as a guest or a signed-in account; signing in also lets you save addresses, message
            suppliers, and see your order history under My orders.
          </p>
          <p>
            Have a question about a specific product before ordering? Open the listing and use{" "}
            <strong>Send inquiry</strong> on the supplier panel — it opens a message thread with that supplier
            about that exact item.
          </p>
          <QuickActions
            actions={[
              { href: "/listing", label: "Browse categories", icon: Grid3x3 },
              { href: "/cart", label: "My cart", icon: ShoppingCart },
              { href: "/sign-in", label: "Sign in", icon: LogIn },
              { href: "/sign-up", label: "Create account", icon: UserPlus },
              { href: "/profile#addresses", label: "Saved addresses", icon: MapPin },
              { href: "/messages", label: "Messages", icon: MessageCircle },
              { href: "/profile#orders", label: "My orders", icon: Package },
            ]}
          />
        </div>
      </section>

      <section id="shipping" className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Truck size={20} aria-hidden="true" />
          Shipping info
        </h2>
        <div className={styles.sectionBody}>
          <p>
            Each product page shows which countries its supplier currently ships to, based on your selected
            &quot;Deliver to&quot; country in the header. Estimated transit time varies by supplier and
            destination — typically 7–14 business days for standard shipping on bulk orders, as noted directly
            on a supplier&apos;s panel where they specify it.
          </p>
          <ul className={styles.list}>
            <li>Shipping cost and exact timelines are set per supplier, not a flat marketplace-wide rate.</li>
            <li>Bulk/freight orders may ship separately from smaller sample orders.</li>
            <li>Tracking, once a real fulfillment step exists, would appear under My orders in your profile.</li>
          </ul>
          <QuickActions actions={[{ href: "/profile#orders", label: "My orders", icon: Package }]} />
        </div>
      </section>

      <section id="returns" className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <RotateCcw size={20} aria-hidden="true" />
          Returns &amp; refunds
        </h2>
        <div className={styles.sectionBody}>
          <p>
            For bulk/wholesale orders, most suppliers on this marketplace offer a sample order first so you can
            check quality before committing to a full order — look for &quot;Sample orders available&quot; on a
            supplier&apos;s message replies or product page.
          </p>
          <p>
            If an order arrives damaged, defective, or materially different from its listing, contact the
            supplier directly through Messages within 7 days of delivery to arrange a return or replacement.
            Return shipping and restocking terms vary by supplier and item — check the product&apos;s own
            listing for anything it specifies before ordering.
          </p>
          <QuickActions actions={[{ href: "/messages", label: "Message a supplier", icon: MessageCircle }]} />
        </div>
      </section>

      <section id="contact" className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Mail size={20} aria-hidden="true" />
          Contact us
        </h2>
        <div className={styles.sectionBody}>
          <p>Two ways to reach out, depending on what it&apos;s about:</p>
          <div className={styles.contactCards}>
            <div className={styles.contactCard}>
              <MessageCircle size={22} aria-hidden="true" className={styles.contactIcon} />
              <h3>About a specific order or product</h3>
              <p>Message the supplier directly — they can answer pricing, MOQ, and shipping questions fastest.</p>
              <Link href="/messages" className={styles.contactLink}>
                Go to Messages
              </Link>
            </div>
            <div className={styles.contactCard}>
              <Mail size={22} aria-hidden="true" className={styles.contactIcon} />
              <h3>Everything else</h3>
              <p>
                General questions about the site: <a href="mailto:support@example.com">support@example.com</a>
              </p>
              <span className={styles.contactNote}>Demo address — not a monitored inbox.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
