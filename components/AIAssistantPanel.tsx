"use client";

// components/AIAssistantPanel.tsx — the AI Shopping Assistant's chat
// drawer. Rendered once in app/layout.tsx (see AIAssistantContext),
// always mounted (not conditionally rendered) so it can animate both
// open AND closed, and so nothing about it — draft text included —
// is lost just from closing the panel. inert={!open} removes it from
// tab order / the accessibility tree while closed. While open, it
// behaves as a real dialog: initial focus moves inside, Tab/Shift+Tab
// are trapped to its own currently-visible/enabled controls (see
// handlePanelKeyDown), and closing returns focus to the "AI Assistant"
// trigger button. The page behind it stays visually interactive (no
// backdrop dimming it, only a transparent click-to-close scrim) — the
// trap is keyboard-only, matching what a non-blocking drawer needs.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { AlertCircle, ArrowDown, Bot, Send, Sparkles, Square, X } from "lucide-react";
import { useAIAssistantChat, useAIAssistantUI, type ChatMessage } from "@/context/AIAssistantContext";
import { useCurrency } from "@/context/CurrencyContext";
import styles from "./AIAssistantPanel.module.css";

const SUGGESTIONS = [
  "I need headphones for gaming under $100",
  "Show me something for home decor",
  "What's a good gift under $50?",
];

// Kept intentionally small — a chat bubble doesn't need headings,
// tables, or images; this just keeps common prose (bold, lists,
// links, inline code) legible without pulling in remark-gfm for
// features this assistant's replies won't use.
const MARKDOWN_COMPONENTS = {
  p: (props: React.ComponentPropsWithoutRef<"p">) => <p className={styles.mdP} {...props} />,
  ul: (props: React.ComponentPropsWithoutRef<"ul">) => <ul className={styles.mdList} {...props} />,
  ol: (props: React.ComponentPropsWithoutRef<"ol">) => <ol className={styles.mdList} {...props} />,
  a: (props: React.ComponentPropsWithoutRef<"a">) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  code: (props: React.ComponentPropsWithoutRef<"code">) => <code className={styles.mdCode} {...props} />,
};

export default function AIAssistantPanel() {
  const { open, close, triggerRef: buttonRef } = useAIAssistantUI();
  const { messages, isStreaming, sendMessage, stop } = useAIAssistantChat();
  const { formatPrice } = useCurrency();

  const [draft, setDraft] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  // Tracks whether the panel was actually open on a previous render, so
  // the effect below can tell "just opened" from "just closed" apart
  // from the initial, never-opened mount (where there's no trigger
  // focus to restore yet).
  const wasOpenRef = useRef(false);

  // Move focus into the panel on open; move it back to the "AI
  // Assistant" navbar button on close — every close path (Close
  // button, Escape, the click-to-close scrim, re-toggling the navbar
  // button) funnels through the same `close`/`toggle` calls in
  // AIAssistantContext, so watching `open` itself covers all of them
  // in one place rather than special-casing each closer. This matters
  // even for the "click the navbar button again" case: once the panel
  // is `inert` on close, the browser drops focus out of whatever was
  // focused inside it (usually to <body>) rather than leaving it in
  // place, so relying on "the browser already did it" isn't enough.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      closeBtnRef.current?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      buttonRef.current?.focus();
    }
  }, [open, buttonRef]);

  // Escape closes it — same convention as every dropdown in this
  // header (see useDisclosure), reimplemented here directly since
  // this panel deliberately does NOT use that hook's outside-click-
  // closes behavior (accidentally clicking a product card behind an
  // open chat shouldn't discard the conversation).
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  // Focus trap: keeps Tab/Shift+Tab cycling through only the panel's
  // currently visible/enabled controls instead of falling through to
  // the rest of the page once Tab runs past the last one (this is what
  // let focus "disappear" past a disabled Send button and end up in
  // browser chrome). Recomputed on every Tab press rather than cached,
  // since which controls are visible/enabled changes live — the Send
  // vs. Stop button swap, the Send button's own disabled state, and
  // "Jump to latest" all come and go while the panel stays open.
  function handlePanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Auto-scroll while streaming, but only if the reader was already
  // at the bottom — the core "don't yank the user back down" rule.
  // `messages` changing here is this effect's own external-system
  // trigger (new streamed content landing asynchronously via fetch,
  // same justification ShipCountryContext's own localStorage sync
  // effect uses) — the DOM scroll position genuinely can't be
  // adjusted until after the new content has already committed to
  // the DOM, which is exactly what this effect is for.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      setShowJumpToLatest(false);
    } else if (messages.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowJumpToLatest(true);
    }
  }, [messages]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 72;
    isAtBottomRef.current = atBottom;
    if (atBottom) setShowJumpToLatest(false);
  }

  function jumpToLatest() {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    isAtBottomRef.current = true;
    setShowJumpToLatest(false);
  }

  // Auto-grow up to a cap, then the textarea scrolls internally —
  // keeps the composer reachable instead of eating the whole panel on
  // a long multi-line message.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  function handleSend(text?: string) {
    const value = (text ?? draft).trim();
    if (!value || isStreaming) return;
    sendMessage(value);
    setDraft("");
    // Reset the grown height immediately rather than waiting for the
    // draft-change effect above (which won't fire again for an
    // already-empty string going to empty).
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Shift+Enter: no special handling needed — the browser's own
    // default textarea behavior already inserts a newline.
  }

  return (
    <>
      {/* Dedicated click-to-close scrim, not a full inert backdrop —
          it's transparent and only present while open, purely so a
          click anywhere outside the panel closes it without also
          blocking scroll/interaction on the rest of the page the way
          a real modal backdrop would. */}
      {open && <div className={styles.scrim} onClick={close} aria-hidden="true" />}

      <div
        ref={panelRef}
        id="ai-assistant-panel"
        role="dialog"
        aria-label="AI Shopping Assistant"
        aria-hidden={!open}
        aria-modal={open}
        inert={!open}
        onKeyDown={handlePanelKeyDown}
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
      >
        <header className={styles.header}>
          <span className={styles.headerTitle}>
            <Sparkles size={18} aria-hidden="true" />
            ShopMate
          </span>
          <button type="button" ref={closeBtnRef} className={styles.closeBtn} onClick={close} aria-label="Close AI Shopping Assistant">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.body} ref={listRef} onScroll={handleScroll}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <Bot size={28} aria-hidden="true" className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>Tell me what you&apos;re shopping for.</p>
              <p className={styles.emptyBody}>
                Give me a budget, a use case, or a category and I&apos;ll help you narrow it down — using this
                site&apos;s actual catalog, not guesses.
              </p>
              <div className={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className={styles.suggestionBtn} onClick={() => handleSend(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className={styles.messageList} aria-live="polite" aria-relevant="additions">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} isStreaming={isStreaming} formatPrice={formatPrice} />
              ))}
            </ul>
          )}
        </div>

        {showJumpToLatest && (
          <button type="button" className={styles.jumpBtn} onClick={jumpToLatest}>
            <ArrowDown size={14} aria-hidden="true" />
            Jump to latest
          </button>
        )}

        <form
          className={styles.composer}
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <label htmlFor="ai-assistant-input" className="sr-only">
            Message ShopMate
          </label>
          <textarea
            id="ai-assistant-input"
            ref={textareaRef}
            className={styles.composerInput}
            placeholder="Ask about a product, budget, or use case..."
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {isStreaming ? (
            <button type="button" className={styles.stopBtn} onClick={stop} aria-label="Stop generating">
              <Square size={16} aria-hidden="true" fill="currentColor" />
            </button>
          ) : (
            <button type="submit" className={styles.sendBtn} disabled={!draft.trim()} aria-label="Send message">
              <Send size={18} aria-hidden="true" />
            </button>
          )}
        </form>
        <p className={styles.composerHint}>Enter to send · Shift+Enter for a new line</p>
      </div>
    </>
  );
}

function MessageBubble({
  message,
  isStreaming,
  formatPrice,
}: {
  message: ChatMessage;
  isStreaming: boolean;
  formatPrice: (usd: number) => string;
}) {
  const isUser = message.role === "user";
  // Only the LAST assistant message can legitimately still be
  // "thinking" — a finished one earlier in the list never shows dots
  // just because the panel is streaming another reply right now.
  const showThinking = !isUser && isStreaming && message.content === "" && !message.error;

  return (
    <li className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
      {!isUser && (
        <span className={styles.bubbleAvatar} aria-hidden="true">
          <Sparkles size={14} />
        </span>
      )}
      <div className={styles.bubbleContent}>
        {isUser ? (
          <p className={styles.userText}>{message.content}</p>
        ) : showThinking ? (
          <span className={styles.thinking} role="status" aria-label="ShopMate is thinking">
            <span className={styles.thinkingDot} />
            <span className={styles.thinkingDot} />
            <span className={styles.thinkingDot} />
          </span>
        ) : (
          <div className={styles.markdown}>
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>{message.content}</ReactMarkdown>
          </div>
        )}

        {message.products && message.products.length > 0 && (
          <div className={styles.productRow}>
            {message.products.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`} className={styles.productCard}>
                <span className={styles.productName}>{p.name}</span>
                <span className={styles.productPrice}>{formatPrice(p.price)}</span>
              </Link>
            ))}
          </div>
        )}

        {message.error && (
          <p className={styles.errorText} role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            {message.error}
          </p>
        )}
      </div>
    </li>
  );
}
