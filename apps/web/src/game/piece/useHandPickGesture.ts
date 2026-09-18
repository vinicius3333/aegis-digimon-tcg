import { useEffect, useRef } from "react";
import { pressGesture } from "../pressGesture";
import type { HandSelection } from "./types";

/** How long a still press must last before it reads the card instead of picking it. */
export const HAND_INSPECT_HOLD_MS = 400;

/**
 * A pick is taken from the pointer, not from the click that may follow it. On
 * touch the hand is a `pan-x` scroll-snap row, so the browser is free to turn a
 * tap into a scroll or to retarget the trailing click at the row — which left a
 * board-mode selection unanswerable with a finger. Every other tap on this
 * screen is already read this way (see GameScreen's drag/tap recognizer).
 *
 * A press held still for `HAND_INSPECT_HOLD_MS` opens the card instead of picking
 * it, so a card can be read without changing the answer.
 */
export function useHandPickGesture(selection: HandSelection | undefined) {
  const pickPress = useRef<{
    pointerId: number;
    instanceId: string;
    x: number;
    y: number;
    touch: boolean;
  } | null>(null);
  /* The card the pointer has just picked or inspected, so the click that trails
     the same gesture cannot toggle it. Only the click is dropped — a browser that
     sends no `pointerup` on the card still answers through its click. */
  const pointerPicked = useRef<string | null>(null);
  const holdTimer = useRef<number | null>(null);

  const clearHold = () => {
    if (holdTimer.current === null) return;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };
  useEffect(() => clearHold, []);

  const tapSelection = (instanceId: string) => {
    if (selection?.selectableInstanceIds.includes(instanceId)) selection.onToggle(instanceId);
  };

  const inspect = (instanceId: string) => {
    clearHold();
    pickPress.current = null;
    pointerPicked.current = instanceId;
    selection?.onInspect?.(instanceId);
  };

  const beginPick = (instanceId: string, event: React.PointerEvent) => {
    // No capture and no preventDefault: the row must stay pannable, exactly as it
    // is while a card is being dragged out of the hand.
    clearHold();
    pointerPicked.current = null;
    pickPress.current = {
      pointerId: event.pointerId,
      instanceId,
      x: event.clientX,
      y: event.clientY,
      touch: event.pointerType !== "mouse",
    };
    if (selection?.onInspect) holdTimer.current = window.setTimeout(() => inspect(instanceId), HAND_INSPECT_HOLD_MS);
  };

  const movePick = (event: React.PointerEvent) => {
    const press = pickPress.current;
    if (!press || press.pointerId !== event.pointerId) return;
    const gesture = pressGesture({ dx: event.clientX - press.x, dy: event.clientY - press.y, touch: press.touch });
    if (gesture !== "press") clearHold();
  };

  const finishPick = (instanceId: string, event: React.PointerEvent) => {
    clearHold();
    const press = pickPress.current;
    pickPress.current = null;
    if (!press || press.pointerId !== event.pointerId || press.instanceId !== instanceId) return;
    const gesture = pressGesture({ dx: event.clientX - press.x, dy: event.clientY - press.y, touch: press.touch });
    if (gesture !== "press") return;
    pointerPicked.current = instanceId;
    tapSelection(instanceId);
  };

  const cancelPick = () => {
    clearHold();
    pickPress.current = null;
  };

  return { pointerPicked, tapSelection, inspect, beginPick, movePick, finishPick, cancelPick };
}
