"use client";

// app/messages/page.tsx — no real messaging backend exists in this
// build, so conversations are seeded from the real SUPPLIER_POOL data
// (same suppliers shown on product pages) with a couple of realistic
// opening messages. Sending a reply appends it to local state only —
// it isn't persisted or sent anywhere. This keeps the UI real and
// interactive without pretending to be a live chat system.
//
// Every supplier across every Deliver-to country is seeded here (not
// just a fixed handful) — a SupplierCard's "Send inquiry" link (see
// there) can point at any of them depending on the product and the
// shopper's current Deliver-to selection, so the inbox has to actually
// contain a thread for whichever one that turns out to be.
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Send, X, Package } from "lucide-react";
import { SUPPLIER_POOL } from "@/services/productData";
import { getProductById } from "@/services/productService";
import { SHIP_COUNTRIES } from "@/context/ShipCountryContext";
import { useCurrency } from "@/context/CurrencyContext";
import type { Product } from "@/types/product";
import styles from "./page.module.css";

// Carried along on a message actually sent about a specific product
// (see the "Send inquiry" arrival flow below) — just the fields the
// inline reference card needs, not the whole Product.
interface MessageProductRef {
  id: string;
  name: string;
  img: string;
  price: number;
}

interface Message {
  from: "me" | "supplier";
  text: string;
  product?: MessageProductRef;
}

interface Conversation {
  id: string;
  supplierName: string;
  initial: string;
  color: string;
  flag: string;
  country: string;
  messages: Message[];
}

function buildMockConversations(): Conversation[] {
  // Every supplier in the catalog, from every Deliver-to country — not
  // a fixed slice of just a few countries' worth. Supplier names are
  // unique across the whole pool, so the name alone is a stable id (see
  // the effect below that matches a "Send inquiry" click back to one of
  // these by name).
  const suppliers = Object.values(SUPPLIER_POOL).flat();

  const openers = [
    "Thanks for your interest — happy to answer any questions about bulk pricing.",
    "Our MOQ for this item is 50 units. Let me know your target quantity.",
    "We can ship worldwide, typically 7-14 business days depending on destination.",
    "Sample orders are available if you'd like to check quality before a bulk order.",
    "Let us know your target price and we'll see what we can do.",
  ];

  return suppliers.map((s, i) => ({
    id: s.name,
    supplierName: s.name,
    initial: s.initial,
    color: s.color,
    flag: s.flag,
    country: s.country,
    messages: [{ from: "supplier", text: openers[i % openers.length] }],
  }));
}

export default function MessagesPage() {
  const { formatPrice } = useCurrency();
  const [conversations, setConversations] = useState<Conversation[]>(() => buildMockConversations());
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  // The product a "Send inquiry" link arrived with — shown as a
  // dismissible reference chip above the composer while the shopper is
  // still writing, and attached to the actual message once they send
  // it (see handleSend). Cleared either way: sending it or dismissing
  // it both mean this pending reference is resolved.
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  // Arriving via a product page's "Send inquiry" link (see
  // SupplierCard.tsx) carries ?supplier=<name>&product=<id> — opens
  // that specific supplier's thread (instead of always defaulting to
  // whichever conversation happens to be first) with the composer
  // pre-filled with a message naming the actual product, not a blank
  // thread the shopper has to explain from scratch. A useEffect, not
  // something read during the initial render: this page prerenders
  // statically (no real URL available at that point), so the actual
  // query string is only knowable once this runs in the browser after
  // hydration. buildMockConversations() is called again here rather
  // than closing over the `conversations` state above — it's a pure
  // function of no external state, so this doesn't need to depend on
  // (or risk re-running against a stale copy of) that state.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const supplierName = params.get("supplier");
    const productId = params.get("product");
    if (!supplierName) return;
    const match = buildMockConversations().find((c) => c.supplierName === supplierName);
    if (!match) return;
    // Reading the URL is itself the external-system sync this effect
    // exists for (same justification, same pattern already used in
    // ShipCountryContext.tsx for window.localStorage) — the state
    // updates just reflect what that read found.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveId(match.id);
    if (productId) {
      const product = getProductById(productId);
      if (product) {
        setPendingProduct(product);
        setDraft(`Hi, I'm interested in "${product.name}". Could you share more details on pricing and MOQ?`);
      }
    }
  }, []);

  const filtered = useMemo(
    () => conversations.filter((c) => c.supplierName.toLowerCase().includes(query.trim().toLowerCase())),
    [conversations, query]
  );

  const active = conversations.find((c) => c.id === activeId) ?? null;
  // Reuses SHIP_COUNTRIES' own per-flag real dimensions (see its
  // comment) rather than another hardcoded width/height guess here —
  // same flag files SupplierCard/DeliverToSelector render, same
  // varying aspect ratios.
  const activeFlagDims = active ? SHIP_COUNTRIES.find((c) => c.value === active.country) : undefined;

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    const text = draft.trim();
    // Attaches whatever product this inquiry was about (if any) to the
    // message actually being sent right now — not to every message in
    // the thread, and not silently on arrival: the shopper still has
    // to press Send themselves, same as any other message here.
    const product: MessageProductRef | undefined = pendingProduct
      ? { id: pendingProduct.id, name: pendingProduct.name, img: pendingProduct.img, price: pendingProduct.price }
      : undefined;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === active.id ? { ...c, messages: [...c.messages, { from: "me", text, product }] } : c
      )
    );
    setDraft("");
    setPendingProduct(null);
  }

  return (
    <div className={`wrap ${styles.pageContainer}`}>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Conversations">
          <h1 className={styles.sidebarTitle}>Messages</h1>

          <div className={styles.searchWrap}>
            <Search size={16} aria-hidden="true" />
            <label htmlFor="convSearch" className="sr-only">
              Search conversations
            </label>
            <input
              id="convSearch"
              type="text"
              placeholder="Search conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <ul className={styles.convList}>
            {filtered.map((c) => {
              const lastMessage = c.messages[c.messages.length - 1];
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`${styles.convBtn} ${c.id === activeId ? styles.convBtnActive : ""}`}
                    onClick={() => setActiveId(c.id)}
                    aria-current={c.id === activeId ? "true" : undefined}
                  >
                    <span className={styles.convAvatar} style={{ background: c.color }} aria-hidden="true">
                      {c.initial}
                    </span>
                    <span className={styles.convInfo}>
                      <span className={styles.convName}>{c.supplierName}</span>
                      <span className={styles.convPreview}>{lastMessage?.text}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className={styles.noResults}>No conversations match.</li>}
          </ul>
        </aside>

        <div className={styles.mainPanel}>
          {!active ? (
            <div className={styles.emptyState} role="status">
              <h2>Your messages</h2>
              <p>Select a conversation to start messaging or contact a supplier from a product page.</p>
            </div>
          ) : (
            <>
              <header className={styles.threadHeader}>
                <span className={styles.convAvatar} style={{ background: active.color }} aria-hidden="true">
                  {active.initial}
                </span>
                <div>
                  <p className={styles.threadName}>{active.supplierName}</p>
                  <p className={styles.threadCountry}>
                    <Image
                      src={active.flag}
                      alt=""
                      width={activeFlagDims?.flagWidth ?? 28}
                      height={activeFlagDims?.flagHeight ?? 20}
                      style={{ height: "11px", width: "auto" }}
                    />
                    {active.country}
                  </p>
                </div>
              </header>

              <ul className={styles.thread} aria-label={`Conversation with ${active.supplierName}`}>
                {active.messages.map((m, i) => (
                  <li
                    key={i}
                    className={`${styles.bubble} ${m.from === "me" ? styles.bubbleMe : styles.bubbleThem}`}
                  >
                    {/* A real inquiry sent from a product page (see
                        pendingProduct/handleSend) carries which product
                        it was about — shown as a small reference card
                        inside the bubble, the same "regarding this
                        item" context a real marketplace inbox shows,
                        not just plain text the supplier has to
                        interpret. */}
                    {m.product && (
                      <Link href={`/product/${m.product.id}`} className={styles.bubbleProductRef}>
                        <Image
                          src={m.product.img}
                          alt=""
                          width={40}
                          height={40}
                          className={styles.bubbleProductImg}
                        />
                        <span className={styles.bubbleProductInfo}>
                          <span className={styles.bubbleProductName}>{m.product.name}</span>
                          <span className={styles.bubbleProductPrice}>{formatPrice(m.product.price)}</span>
                        </span>
                      </Link>
                    )}
                    {m.text}
                  </li>
                ))}
              </ul>

              {pendingProduct && (
                <div className={styles.pendingProductChip}>
                  <Package size={14} aria-hidden="true" />
                  <span className={styles.pendingProductChipText}>
                    Asking about <strong>{pendingProduct.name}</strong>
                  </span>
                  <button
                    type="button"
                    className={styles.pendingProductChipClose}
                    onClick={() => setPendingProduct(null)}
                    aria-label="Remove product reference"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              )}

              <form className={styles.composer} onSubmit={handleSend}>
                <label htmlFor="messageDraft" className="sr-only">
                  Message
                </label>
                <input
                  id="messageDraft"
                  type="text"
                  placeholder="Type a message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className={styles.composerInput}
                />
                <button type="submit" className={styles.sendBtn} disabled={!draft.trim()}>
                  <Send size={16} aria-hidden="true" />
                  <span className="sr-only">Send</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
