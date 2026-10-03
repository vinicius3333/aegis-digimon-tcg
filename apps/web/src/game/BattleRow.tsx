import { useLayoutEffect, useRef, useState, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";

/** Horizontal overhang of a 1.4:1 card after a 90° turn, plus room for its outline and shadow. */
export function suspendedCardEdgeClearance(cardWidth: number): number {
  return Math.ceil(cardWidth * 0.2) + 8;
}

/** Keep the row's existing arena layout; controls live outside its clipping area. */
export function BattleRow({
  children,
  edgeClearance = 0,
  ...props
}: HTMLAttributes<HTMLDivElement> & { edgeClearance?: number }) {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false, x: 0, y: 0, end: 0 });
  const measureRef = useRef<() => void>(undefined);
  // A sibling lane appearing can move this one without resizing it, so every render
  // re-reads where the paging controls belong. Reading is cheap; re-creating the
  // observers below on every render was not.
  useLayoutEffect(() => measureRef.current?.());
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    function measure() {
      const rect = row!.getBoundingClientRect();
      const zones = row!.closest(".game-battle-zones");
      const field = zones && getComputedStyle(zones).overflowY === "auto" ? zones : row!.closest(".game-field");
      const fieldRect = field?.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      // Controls are portalled outside the scroller. Keep them within the
      // visible field when a short portrait screen scrolls its two players.
      const visible = !fieldRect || (center - 22 >= fieldRect.top && center + 22 <= fieldRect.bottom);
      const next = {
        left: visible && row!.scrollLeft > 1,
        right: visible && row!.scrollWidth - row!.clientWidth - row!.scrollLeft > 1,
        x: rect.left,
        y: rect.top + rect.height / 2,
        end: rect.right,
      };
      setEdges((previous) =>
        Object.keys(next).every((key) => previous[key as keyof typeof next] === next[key as keyof typeof next])
          ? previous
          : next,
      );
    }
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    const observeChildren = () => {
      observer?.disconnect();
      observer?.observe(row);
      for (const child of row.children) observer?.observe(child);
    };
    // Set up once rather than on every render: a crowded board re-rendered every
    // lane's observers and listeners on each state change. Cards entering or
    // leaving re-observe the children; any size change re-measures.
    const children = typeof MutationObserver === "undefined" ? undefined : new MutationObserver(observeChildren);
    children?.observe(row, { childList: true });
    observeChildren();
    measureRef.current = measure;
    row.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    measure();
    return () => {
      observer?.disconnect();
      children?.disconnect();
      measureRef.current = undefined;
      row.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, []);

  function scroll(direction: number) {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({
      left: direction * row.clientWidth * 0.7,
      // A paging button immediately reveals its destination. Native swipes
      // retain their momentum, independently of the card regrouping animation.
      behavior: "instant",
    });
  }

  return (
    <>
      <div {...props} ref={rowRef}>
        {edgeClearance > 0 ? (
          <span
            className="game-battle-row__turn-clearance"
            aria-hidden
            style={{ flex: `0 0 ${edgeClearance}px`, width: edgeClearance, alignSelf: "stretch" }}
          />
        ) : null}
        {children}
        {edgeClearance > 0 ? (
          <span
            className="game-battle-row__turn-clearance"
            aria-hidden
            style={{ flex: `0 0 ${edgeClearance}px`, width: edgeClearance, alignSelf: "stretch" }}
          />
        ) : null}
      </div>
      {createPortal(
        <>
          {edges.left && (
            <button
              type="button"
              className="game-battle-scroll-arrow"
              aria-label={`${props["aria-label"]}: ${t("game.fieldScrollLeft")}`}
              style={{ left: edges.x + 4, top: edges.y }}
              onClick={() => scroll(-1)}
            >
              <Icons.ChevronLeft size={22} />
            </button>
          )}
          {edges.right && (
            <button
              type="button"
              className="game-battle-scroll-arrow"
              aria-label={`${props["aria-label"]}: ${t("game.fieldScrollRight")}`}
              style={{ left: edges.end - 40, top: edges.y }}
              onClick={() => scroll(1)}
            >
              <Icons.ChevronRight size={22} />
            </button>
          )}
        </>,
        document.getElementById("aegis-stage") ?? document.body,
      )}
    </>
  );
}
