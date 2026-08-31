"use client";

// ============================================================
// components/Navbar.tsx — site header + category navigation.
// Real <button>/<a> elements throughout (no div onClick), full
// keyboard support, cart count wired to CartContext.
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, User, MessageCircle, Package, Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { filterProducts } from "@/services/productService";
import CategoryFlyout from "@/components/CategoryFlyout";
import DeliverToSelector from "@/components/DeliverToSelector";
import LanguageCurrencySelector from "@/components/LanguageCurrencySelector";
import AIAssistantButton from "@/components/AIAssistantButton";
import SearchHistoryDropdown from "@/components/SearchHistoryDropdown";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import styles from "./Navbar.module.css";

// Capped low — this is a quick-pick suggestion list next to the search
// box, not the full results page (which /listing already renders with
// pagination). The catalog is small (~60 products) and already shipped
// to the client for the category mega menu (CategoryFlyout does the
// same filterProducts/productData import), so matching on every
// keystroke here is a synchronous in-memory filter, not a network
// round trip — no debounce needed for it to feel instant.
const SEARCH_SUGGESTION_LIMIT = 5;

export default function Navbar() {
  const { itemCount, hydrated } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { isSignedIn } = useAuth();

  // Pulse the badge only on a real change after hydration — never on
  // the initial localStorage load, which isn't a user action.
  const prevCountRef = useRef(itemCount);
  const [badgePulse, setBadgePulse] = useState(false);
  useEffect(() => {
    if (!hydrated) {
      prevCountRef.current = itemCount;
      return;
    }
    if (itemCount !== prevCountRef.current) {
      prevCountRef.current = itemCount;
      setBadgePulse(true);
      const t = window.setTimeout(() => setBadgePulse(false), 220);
      return () => window.clearTimeout(t);
    }
  }, [itemCount, hydrated]);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { history, addEntry, removeEntry, clearAll } = useSearchHistory();
  const [historyOpen, setHistoryOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Live product matches for the current query — recomputed only when
  // the query text actually changes, not on every one of the header's
  // other re-renders (cart badge pulse, etc.).
  const matchingProducts = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed) {
      return filterProducts({ q: trimmed }).slice(0, SEARCH_SUGGESTION_LIMIT);
    }
    // Nothing typed yet: fall back to real products from a past search
    // instead of showing none at all — this is what makes clicking
    // into an empty, already-used search box show real products from
    // what was previously searched, not just the plain text of past
    // queries. Walks back through history rather than only trying the
    // single most recent term — the latest search might itself have
    // matched nothing in the catalog (a typo, a category this store
    // doesn't carry), which shouldn't hide an earlier search's real
    // matches too.
    for (const term of history) {
      const matches = filterProducts({ q: term }).slice(0, SEARCH_SUGGESTION_LIMIT);
      if (matches.length > 0) return matches;
    }
    return [];
  }, [query, history]);

  // Recent-searches dropdown: closes on Escape or a click/tap outside
  // the search field + panel — same outside-click/Escape convention
  // hooks/useDisclosure.ts already uses for the other header dropdowns
  // (Deliver to, language/currency). Not built on that hook directly
  // because its trigger ref is typed for a <button>, not the <input>
  // this dropdown opens from.
  useEffect(() => {
    if (!historyOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (searchWrapRef.current?.contains(e.target as Node)) return;
      setHistoryOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setHistoryOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [historyOpen]);

  function performSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    addEntry(trimmed);
    setHistoryOpen(false);
    router.push(`/listing?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    performSearch(query);
  }

  return (
    <header className={styles.siteHeader}>
      <div className={`wrap ${styles.headerRow}`}>
        {/* Mobile-only: replaces the header's account links AND the
            whole category/deliver-to/language row below (both hidden
            at this width — see Navbar.module.css) with one menu. */}
        <MobileNavDrawer isSignedIn={isSignedIn} wishlistCount={wishlistCount} />

        <Link href="/" className={styles.brand} aria-label="Go to homepage">
          <Image src="/images/logo-symbol.webp" alt="" width={32} height={32} priority />
          {/* Real text, not the old Brand@2x.webp image — that file was a
              picture of the literal word "Brand", a placeholder left over
              from before the site was actually named, while the rest of
              the app (page titles, SEO metadata, the footer's own
              .brand text) has said "TradeHub" all along. Text also
              renders crisp at any zoom/DPI instead of being a fixed-
              resolution raster, and is real content for a screen
              reader/search engine rather than needing an alt string to
              carry the name. Hidden below the mobile breakpoint (icon
              alone stays) — icon + wordmark + hamburger + search all
              fighting for the same narrow row is what made the header
              wrap across multiple lines and balloon in height on a
              phone. */}
          <span className={styles.brandWordmark}>TradeHub</span>
        </Link>

        <div className={styles.searchWrap} ref={searchWrapRef}>
          <form className={styles.searchForm} role="search" onSubmit={handleSearchSubmit}>
            <label htmlFor="site-search" className="sr-only">
              Search products, brands and more
            </label>
            <input
              id="site-search"
              type="search"
              name="q"
              className={styles.searchInput}
              placeholder="Search products, brands and more..."
              value={query}
              autoComplete="off"
              role="combobox"
              aria-expanded={historyOpen}
              aria-controls="search-history-listbox"
              aria-autocomplete="list"
              onChange={(e) => {
                setQuery(e.target.value);
                setHistoryOpen(true);
              }}
              onFocus={() => setHistoryOpen(true)}
            />
            <button type="submit" className={styles.searchBtn}>
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search</span>
            </button>
          </form>

          {historyOpen && (
            <SearchHistoryDropdown
              history={history}
              products={matchingProducts}
              query={query}
              onSelectHistory={(term) => {
                setQuery(term);
                performSearch(term);
              }}
              onRemoveHistory={removeEntry}
              onClearAllHistory={clearAll}
              onSelectProduct={() => setHistoryOpen(false)}
            />
          )}
        </div>

        {/* Directly beside search, per the AI assistant's own
            requirement — search and AI shopping assistance are both
            discovery features, not separated into an unrelated part
            of the header. */}
        <AIAssistantButton />

        {/* Mobile-only quick access — Cart is the one account link kept
            visible outside the hamburger menu, same reasoning most
            mobile e-commerce headers use it for: it's the one thing a
            shopper needs a glance/tap at without detouring through a
            menu. Profile/Messages/Orders/Wishlist move into
            MobileNavDrawer instead. */}
        <Link href="/cart" className={styles.mobileCartLink} aria-label={`Cart, ${itemCount} items`}>
          <span className={styles.cartIconWrap}>
            <ShoppingCart size={22} aria-hidden="true" />
            {itemCount > 0 && (
              <span className={`${styles.cartBadge} ${badgePulse ? styles.cartBadgePulse : ""}`} aria-hidden="true">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </span>
        </Link>

        <div className={styles.headerLinks}>
          {/* /profile already handles being visited while signed out (it
              prompts sign-in via the quick modal — see app/profile/page.tsx),
              but linking straight to the new full-page Sign In when signed
              out is the more direct path for the header's own primary
              account entry point specifically. Every other account-gated
              trigger in the app (wishlist heart, review Helpful vote,
              checkout) is untouched and still opens the modal. */}
          <Link href={isSignedIn ? "/profile" : "/sign-in"} className={styles.headerItem}>
            <User size={20} aria-hidden="true" />
            <span>{isSignedIn ? "Profile" : "Sign In"}</span>
          </Link>
          <Link href="/messages" className={styles.headerItem}>
            <MessageCircle size={20} aria-hidden="true" />
            <span>Messages</span>
          </Link>
          <Link href="/profile#orders" className={styles.headerItem}>
            <Package size={20} aria-hidden="true" />
            <span>Orders</span>
          </Link>
          <Link href="/wishlist" className={styles.headerItem}>
            <span className={styles.cartIconWrap}>
              <Heart size={20} aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className={styles.cartBadge} aria-hidden="true">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </span>
            <span>
              Wishlist
              <span className="sr-only">, {wishlistCount} items</span>
            </span>
          </Link>
          <Link href="/cart" className={`${styles.headerItem} ${styles.cartLink}`}>
            <span className={styles.cartIconWrap}>
              <ShoppingCart size={20} aria-hidden="true" />
              {itemCount > 0 && (
                <span
                  className={`${styles.cartBadge} ${badgePulse ? styles.cartBadgePulse : ""}`}
                  aria-hidden="true"
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </span>
            <span>
              My cart
              <span className="sr-only">, {itemCount} items</span>
            </span>
          </Link>
        </div>
      </div>

      <nav className={styles.categoryNav} aria-label="Product categories">
        <div className={`wrap ${styles.categoryNavRow}`}>
          <CategoryFlyout />

          {/* All 9 categories already live in the CategoryFlyout mega menu
              (with richer product previews) — repeating every one of them
              again here doesn't add reachability, it just doesn't fit:
              at ~1143px this list alone was wider than the row's whole
              1248px budget, wrapping the row to 3 lines. Alibaba's own
              equivalent row is exactly this shape too: a couple of short
              links next to the category trigger, not a full restatement
              of the category list. */}
          <ul className={styles.categoryList}>
            {/* Wherever a shopper currently is, one click back to the
                homepage — same plain link styling as Trending below it;
                only Deals gets the accent-red treatment. */}
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/listing?deals=1" className={styles.dealsLink}>
                Deals
              </Link>
            </li>
            <li>
              <Link href="/listing?sort=trending">Trending</Link>
            </li>
          </ul>

          <Link href="/support" className={styles.helpLink}>
            Help
          </Link>

          <div className={styles.navRowRight}>
            <DeliverToSelector />
            <LanguageCurrencySelector />
          </div>
        </div>
      </nav>
    </header>
  );
}
