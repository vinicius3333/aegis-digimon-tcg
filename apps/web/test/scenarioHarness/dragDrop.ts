import { fireEvent } from "@testing-library/react";

/**
 * Simulates the real client's drag-and-drop gesture — pointerdown on `sourceEl`,
 * pointermove past the 6px "started" threshold, then pointerup on a point inside
 * `targetEl` — for scenarios that must digivolve onto (or otherwise drop a hand card
 * on) a battle-area permanent. A plain click-based tap can't do this: any Digimon
 * eligible to attack is "draggable" in GameScreen.tsx, which strips its plain
 * `onClick` digivolve-target handler (`onYourPerm`) in favor of the attack-drag
 * `onPointerDown`, so the only way to route a digivolve onto it is the drag path
 * `handleDrop` implements for `target === "perm-you"`.
 *
 * jsdom performs no real layout (`getBoundingClientRect` always reports a zero
 * rect), so `targetEl`'s rect is stubbed to a distinct, non-zero box that the drop
 * coordinates land inside; every other `[data-drop]` element keeps its natural zero
 * rect and therefore can't also contain that same point (`handleDrop` picks the
 * smallest-area zone that contains the drop point, so an unambiguous non-zero
 * target rect is sufficient — the rest don't need individual stubs).
 */
export function dragOnto(sourceEl: Element, targetEl: HTMLElement): void {
  targetEl.getBoundingClientRect = () =>
    ({
      left: 500,
      right: 600,
      top: 500,
      bottom: 600,
      width: 100,
      height: 100,
      x: 500,
      y: 500,
      toJSON: () => {},
    }) as DOMRect;
  fireEvent.pointerDown(sourceEl, { clientX: 100, clientY: 100 });
  fireEvent.pointerMove(window, { clientX: 550, clientY: 550 });
  fireEvent.pointerUp(window, { clientX: 550, clientY: 550 });
}
