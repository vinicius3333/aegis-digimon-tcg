import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface BadgeHintText {
  title: string;
  description: string;
}

const HINT_WIDTH_PX = 240;
const VIEWPORT_MARGIN_PX = 8;
const ANCHOR_GAP_PX = 8;

/** Only one explanation is open on the board at a time. */
let closeOpenHint: (() => void) | undefined;

/**
 * A field badge that explains itself when tapped or clicked, which is the only way
 * a phone can reach the explanation. The badge stays out of the tab order and the
 * accessibility tree: the permanent's own accessible name already speaks every
 * state its badges show. The tap is kept from reaching the permanent, so reading a
 * badge never selects, drags or attacks with the card under it.
 */
export function BadgeHint({
  hint,
  children,
  ...rest
}: { hint: BadgeHintText; children: ReactNode } & Omit<HTMLAttributes<HTMLSpanElement>, "onClick" | "onPointerDown">) {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const close = useCallback(() => {
    setAnchor(null);
    if (closeOpenHint === close) closeOpenHint = undefined;
  }, []);

  useEffect(() => {
    if (!anchor) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node && badgeRef.current?.contains(event.target))) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [anchor, close]);

  useEffect(() => close, [close]);

  return (
    <span
      {...rest}
      ref={badgeRef}
      data-badge-hint=""
      data-hint-open={anchor ? "" : undefined}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (anchor) {
          close();
          return;
        }
        closeOpenHint?.();
        closeOpenHint = close;
        setAnchor(badgeRef.current?.getBoundingClientRect() ?? null);
      }}
    >
      {children}
      {anchor ? createPortal(<BadgeHintPopover anchor={anchor} hint={hint} />, document.body) : null}
    </span>
  );
}

/** Above the badge when there is room, below it otherwise, and never past the screen's edges. */
function BadgeHintPopover({ anchor, hint }: { anchor: DOMRect; hint: BadgeHintText }) {
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const width = Math.min(HINT_WIDTH_PX, viewportWidth - VIEWPORT_MARGIN_PX * 2);
  const center = anchor.left + anchor.width / 2;
  const left = Math.min(Math.max(center - width / 2, VIEWPORT_MARGIN_PX), viewportWidth - width - VIEWPORT_MARGIN_PX);
  const above = anchor.top > window.innerHeight / 3;
  return (
    <span
      className="game-badge-hint"
      role="tooltip"
      data-placement={above ? "above" : "below"}
      style={{
        left,
        width,
        top: above ? anchor.top - ANCHOR_GAP_PX : anchor.bottom + ANCHOR_GAP_PX,
      }}
      // A portal still bubbles React events through the badge to the card.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <strong>{hint.title}</strong>
      <span>{hint.description}</span>
    </span>
  );
}
