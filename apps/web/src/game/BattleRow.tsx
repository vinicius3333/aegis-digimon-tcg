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
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    function measure() {
      const rect = row!.getBoundingClientRect();
      const next = {
        left: row!.scrollLeft > 1,
        right: row!.scrollWidth - row!.clientWidth - row!.scrollLeft > 1,
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
    observer?.observe(row);
    for (const child of row.children) observer?.observe(child);
    row.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    measure();
    return () => {
      observer?.disconnect();
      row.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [children]);

  function scroll(direction: number) {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({
      left: direction * row.clientWidth * 0.7,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
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
