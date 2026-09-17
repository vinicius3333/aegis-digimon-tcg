import type { DropTarget } from "../dragIntents";
import type { DropZoneHit } from "./types";

/** Draw around the printed card; the permanent wrapper stays the interaction target. */
export function permanentVisualElement(element: HTMLElement): HTMLElement {
  return element.querySelector<HTMLElement>(".game-card-enter > [data-state]") ?? element;
}

/**
 * The drop area under a point — the smallest one, so a permanent inside the
 * battle row wins over the row itself. The same lookup answers "what would this
 * drop do" while the card is still in the air and "what did it do" on release.
 */
export function dropZoneAt(cx: number, cy: number): DropZoneHit | null {
  let zone: Element | null = null;
  let bestArea = Infinity;
  document.querySelectorAll("[data-drop]").forEach((candidate) => {
    const rect = candidate.getBoundingClientRect();
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) return;
    const area = rect.width * rect.height;
    if (area >= bestArea) return;
    bestArea = area;
    zone = candidate;
  });
  if (!zone) return null;
  const element = zone as Element;
  const target = element.getAttribute("data-drop");
  if (!target) return null;
  return { target: target as DropTarget, id: element.getAttribute("data-id") ?? undefined };
}
