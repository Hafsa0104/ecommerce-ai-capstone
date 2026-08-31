"use client";

// components/WhatsAppShareButton.tsx — shares the current product page
// to WhatsApp via wa.me's own share-intent URL (no phone number in the
// link — that's WhatsApp's own "let the user pick who to send this to"
// form, not messaging a fixed contact). Reads window.location.href at
// CLICK time rather than baking a URL into the render output — this
// component would otherwise need to guard every render against
// `window` not existing during the server-rendered pass, for a value
// (the page's own URL) nothing here actually needs before the user
// clicks.
import styles from "./WhatsAppShareButton.module.css";

export default function WhatsAppShareButton({ productName }: { productName: string }) {
  function handleClick() {
    const text = `Check out ${productName} on TradeHub: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      className={styles.shareBtn}
      onClick={handleClick}
      aria-label={`Share ${productName} on WhatsApp`}
    >
      {/* The real WhatsApp glyph, not a generic chat-bubble icon — this
          site already has its own "Messages" feature with a chat-bubble
          icon in the navbar, and a lookalike icon here would read as
          "open Messages" instead of "share to WhatsApp specifically". */}
      <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12.014 0C5.464 0 .151 5.313.151 11.863c0 2.09.545 4.132 1.583 5.932L0 24l6.335-1.66a11.795 11.795 0 0 0 5.678 1.448h.005c6.55 0 11.863-5.313 11.863-11.864 0-3.17-1.234-6.148-3.475-8.39A11.788 11.788 0 0 0 12.014 0Zm0 21.688h-.004a9.816 9.816 0 0 1-5.003-1.371l-.359-.213-3.721.976.994-3.629-.235-.373a9.796 9.796 0 0 1-1.503-5.215c0-5.418 4.41-9.828 9.831-9.828a9.75 9.75 0 0 1 6.943 2.884 9.746 9.746 0 0 1 2.884 6.943c0 5.418-4.41 9.826-9.827 9.826Z" />
      </svg>
    </button>
  );
}
