import type { CSSProperties } from "react";
import { HAND_MAX_FAN } from "./handLayout";

export interface HandCardLayoutParams {
  index: number;
  count: number;
  overlap: number;
  handOverflows: boolean;
  selected: boolean;
  hovered: boolean;
  dragging: boolean;
}

/**
 * Per-card fan geometry: how far a card sits from the hand's center, how much it
 * tilts, and the resulting inline style. Pure so the arc math that decides which
 * card a tap lands on can be checked without rendering.
 */
export function computeHandCardLayout({
  index,
  count,
  overlap,
  handOverflows,
  selected,
  hovered,
  dragging,
}: HandCardLayoutParams): CSSProperties {
  const mid = (count - 1) / 2;
  const off = index - mid;
  // The arc always spends the same room, however many cards are fanned, so
  // the outermost card never drops below the dock and out of the window.
  const fan = !handOverflows && mid > 0 ? (Math.abs(off) / mid) * HAND_MAX_FAN : 0;
  const maxFanAngle = Math.min(12, mid * 4);
  const fanAngle = !handOverflows && mid > 0 ? (off / mid) * maxFanAngle : 0;
  // Hover raises a buried card out of the fan so its face can be read; it
  // never grows it. A card is inspected by clicking it, which opens the same
  // focused overlay the touch layout uses.
  const translateY = selected ? -34 : hovered ? -18 : fan;
  const rotate = selected || hovered ? 0 : fanAngle;
  return {
    ...({
      "--arena-hand-margin": `${index === 0 ? 0 : -overlap}px`,
      "--arena-hand-transform": `translateY(${translateY}px) rotate(${rotate}deg)`,
    } as CSSProperties),
    marginLeft: index === 0 ? 0 : -overlap,
    cursor: "grab",
    touchAction: "none",
    transform: `translateY(${translateY}px) rotate(${rotate}deg)`,
    transformOrigin: "bottom center",
    transition: "transform 200ms",
    zIndex: selected ? 50 : hovered ? 40 : 10 + index,
    opacity: dragging ? 0.3 : 1,
    filter: selected
      ? "drop-shadow(0 16px 26px rgba(15,23,42,0.32))"
      : hovered
        ? "drop-shadow(0 10px 18px rgba(15,23,42,0.28))"
        : "drop-shadow(0 4px 8px rgba(15,23,42,0.14))",
  };
}
