"use client";

// components/ProductGallery.tsx — main image + thumbnail switcher.
// Client component because it needs click state; everything else on
// the product page stays server-rendered.
//
// Thumbnails are plain buttons, not a tabs widget: there's no separate
// tabpanel element for a thumbnail to "control" here (the main image is
// just this component's own state, not a distinct panel with its own
// content/labelling), so role="tab"/"tablist" would be ARIA for its own
// sake rather than describing anything real. A labelled group of
// buttons, with aria-current marking the one currently showing (the
// same pattern this project already uses for FilterSidebar's active
// filters and the price-tier cards), says exactly what's true here.
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./ProductGallery.module.css";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  // A transient hover preview, separate from activeIndex (the real
  // selection) — same pattern used for the auth pages' own showcase
  // thumbnails (see AuthSplitPage.tsx). Hovering a thumbnail shows it in
  // the main image only while the pointer is there; the moment it
  // leaves, the main image reverts to whatever's actually selected
  // (wherever a click/keyboard activation or Previous/Next last left
  // it) — never a new selection in its own right.
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  // What's actually painted right now (the preview when there is one,
  // the real selection otherwise) — deliberately NOT what drives
  // aria-current/tabIndex below, which stay on activeIndex: a keyboard
  // or screen reader user never sets previewIndex (mouse-only), so
  // their view of "which one is current" shouldn't flicker because of
  // someone else's mouse position.
  const displayIndex = previewIndex ?? activeIndex;
  const activeImage = images[displayIndex] ?? images[0];
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Automatic activation (moving focus also changes the displayed
  // image) — switching images has no cost that would call for the
  // alternative "focus first, activate on Enter/Space" pattern. Also
  // clears any hover preview so a click always shows the thing that was
  // actually just clicked, not a stale preview left over from wherever
  // the mouse happens to be.
  function selectAndFocus(index: number) {
    setActiveIndex(index);
    setPreviewIndex(null);
    thumbRefs.current[index]?.focus();
  }

  // Fires when the pointer leaves the thumbnail strip entirely (wired
  // to .thumbList's onMouseLeave below) — this is the "moving the mouse
  // back" moment that should make the main image go back to showing the
  // real selection.
  function clearPreview() {
    setPreviewIndex(null);
  }

  // Enter/Space aren't handled here on purpose — these are real
  // <button> elements, so the browser already activates them (fires
  // onClick) on both keys natively. Handling them again here would just
  // duplicate that for no benefit.
  //
  // Clamped, not wrapped: Home/End already reach the ends directly, and
  // matching the non-wrapping Previous/Next buttons means the boundary
  // behaves the same way regardless of which control got you there.
  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let next: number;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(i + 1, images.length - 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(i - 1, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = images.length - 1;
    else return;

    // Also stops Up/Down/Home/End from scrolling the page while a
    // thumbnail has focus, per the same convention used elsewhere in
    // this project's keyboard-nav components (CategoryFlyout, Pagination).
    e.preventDefault();
    selectAndFocus(next);
  }

  // Pointer-tracked zoom (desktop progressive enhancement — see the
  // @media (hover: hover) and (pointer: fine) gate in the CSS, which is
  // what actually makes this desktop-only; these handlers are harmless
  // no-ops on touch since touch doesn't fire a continuous mousemove
  // stream). Listeners live on .mainImageWrap so the overlay Previous/
  // Next buttons — rendered as its DOM *children*, not absolutely
  // positioned siblings — still bubble mousemove up here (a sibling
  // overlay would sit outside .mainImageWrap's own subtree and never
  // reach it, since events bubble through the ancestor chain, not
  // through visual overlap). That same bubbling is why zooming has to be
  // switched off explicitly when the event's target is a button: without
  // this check, hovering an overlay arrow would still read as "hovering
  // the image" and keep the magnifier active over a control, not the
  // photo. transform-origin is set via direct DOM mutation, not React
  // state, so tracking the cursor never triggers a re-render or layout
  // work at mousemove frequency — only `isZooming` goes through React,
  // and only on the moves where it actually flips (crossing between the
  // image and a button, or leaving the wrapper). The wrapper's existing
  // fixed aspect-ratio + overflow:hidden (unchanged) is what turns "a
  // bigger image" into a magnifier that pans, rather than a full-image
  // scale-up: it's real detail that was already off-screen edges panned
  // into view via transform-origin, not the whole image just growing.
  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const wrap = wrapRef.current;
    const img = imageRef.current;
    if (!wrap || !img) return;

    if ((e.target as HTMLElement).closest("button")) {
      setIsZooming(false);
      return;
    }

    const rect = wrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
    setIsZooming(true);
  }

  function handleMouseLeave() {
    setIsZooming(false);
    if (imageRef.current) imageRef.current.style.transformOrigin = "";
  }

  // Previous/Next: non-wrapping, disabled at the ends (native `disabled`,
  // matching the thumbnails' own boundary behavior above).
  //
  // Focus handling: a normal click leaves focus exactly where the
  // browser already put it (on the button just clicked), so clicking
  // repeatedly to page through doesn't require re-tabbing to it each
  // time. The one exception is the click that lands on the first/last
  // image — that same click is about to make this button `disabled`,
  // and a disabled element can't hold focus (the browser would silently
  // drop it to <body>). Moving focus to the now-active thumbnail in
  // that one case avoids that silent loss.
  function handlePrev() {
    const next = activeIndex - 1;
    if (next < 0) return;
    setActiveIndex(next);
    setPreviewIndex(null);
    if (next === 0) thumbRefs.current[next]?.focus();
  }

  function handleNext() {
    const next = activeIndex + 1;
    if (next >= images.length) return;
    setActiveIndex(next);
    setPreviewIndex(null);
    if (next === images.length - 1) thumbRefs.current[next]?.focus();
  }

  return (
    <div className={styles.gallery}>
      <div
        ref={wrapRef}
        className={styles.mainImageWrap}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {images.length > 1 && (
          <button
            type="button"
            className={`${styles.imageNavBtn} ${styles.imageNavBtnPrev}`}
            onClick={handlePrev}
            disabled={activeIndex === 0}
            aria-label="Previous image"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
        )}

        <Image
          key={activeImage}
          ref={imageRef}
          src={activeImage}
          alt={productName}
          width={480}
          height={480}
          // .mainImage (ProductGallery.module.css) renders this at
          // width:100%/height:100% of .mainImageWrap, not the fixed 480px
          // declared above — .mainImageWrap's real width is ~100vw on
          // phone, capped at 26rem on tablet (page.module.css's own
          // comment on that cap), and roughly a third of the 3-column
          // desktop layout above 64rem. Without `sizes`, next/image only
          // generated a 1x/2x srcset off 480px, so at the wider ends of
          // that range the browser had no correctly-sized candidate and
          // upscaled a too-small one — the same root cause as
          // ProductCard's own fix.
          sizes="(max-width: 48rem) 100vw, (max-width: 64rem) 26rem, 35vw"
          priority
          className={`${styles.mainImage} ${isZooming ? styles.mainImageZoomed : ""}`}
        />

        {images.length > 1 && (
          <button
            type="button"
            className={`${styles.imageNavBtn} ${styles.imageNavBtnNext}`}
            onClick={handleNext}
            disabled={activeIndex === images.length - 1}
            aria-label="Next image"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className={styles.thumbNav}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={handlePrev}
            disabled={activeIndex === 0}
            aria-label="Previous image"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>

          <div
            className={styles.thumbList}
            role="group"
            aria-label={`${productName} images`}
            onMouseLeave={clearPreview}
          >
            {images.map((img, i) => (
              <button
                key={img + i}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                type="button"
                aria-current={i === activeIndex ? "true" : undefined}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                tabIndex={i === activeIndex ? 0 : -1}
                className={`${styles.thumbBtn} ${i === activeIndex ? styles.thumbBtnActive : ""}`}
                onClick={() => selectAndFocus(i)}
                // A genuine hover PREVIEW, not a selection — sets
                // previewIndex only, never activeIndex, so the main
                // image shows this while hovered and reverts to the
                // real selection the moment the pointer leaves the
                // strip (.thumbList's onMouseLeave above). State-only,
                // not selectAndFocus — moving keyboard focus on a plain
                // mouse hover would steal it from wherever a keyboard
                // user actually was.
                onMouseEnter={() => setPreviewIndex(i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
              >
                {/* Image cropping lives on this inner wrapper, not the
                    button itself — see the comment on .thumbBtn in
                    ProductGallery.module.css for why that separation is
                    what lets the button use a zoom-safe box-shadow focus
                    ring instead of outline. */}
                <span className={styles.thumbImageClip}>
                  <Image src={img} alt="" width={64} height={64} className={styles.thumbImage} />
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.navBtn}
            onClick={handleNext}
            disabled={activeIndex === images.length - 1}
            aria-label="Next image"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
