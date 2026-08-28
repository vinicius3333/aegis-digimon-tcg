import { fireEvent } from "@testing-library/react";

/**
 * Taps `el` the way a pointer really does: pointerdown, pointerup below the drag
 * threshold, and then the click the browser sends after the gesture.
 *
 * That trailing click is not decoration. A handled tap arms `swallowNextClick`
 * (pressGesture.ts), which eats the one click that follows it — the browser's own,
 * in the real client. A test that goes straight from pointerup to clicking the
 * action bar loses THAT click instead, and the card is never played.
 */
export function tap(el: Element, at: { clientX: number; clientY: number } = { clientX: 100, clientY: 100 }): void {
  fireEvent.pointerDown(el, at);
  fireEvent.pointerUp(window, at);
  fireEvent.click(el);
}
