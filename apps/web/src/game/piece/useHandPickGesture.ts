import { useRef } from "react";
import { pressGesture } from "../pressGesture";
import type { HandSelection } from "./types";

/**
 * A pick is taken from the pointer, not from the click that may follow it. On
 * touch the hand is a `pan-x` scroll-snap row, so the browser is free to turn a
 * tap into a scroll or to retarget the trailing click at the row — which left a
 * board-mode selection unanswerable with a finger. Every other tap on this
 * screen is already read this way (see GameScreen's drag/tap recognizer).
 */
export function useHandPickGesture(selection: HandSelection | undefined) {
  const pickPress = useRef<{
    pointerId: number;
    instanceId: string;
    x: number;
    y: number;
    touch: boolean;
  } | null>(null);
  /* The card the pointer has just picked, so the click that trails the same
     gesture cannot toggle it straight back. Only the click is dropped — a browser
     that sends no `pointerup` on the card still answers through its click. */
  const pointerPicked = useRef<string | null>(null);
  const lastPickTap = useRef<{ instanceId: string; at: number } | null>(null);

  const tapSelection = (instanceId: string) => {
    const previous = lastPickTap.current;
    const now = Date.now();
    if (selection?.onInspect && previous?.instanceId === instanceId && now - previous.at <= 300) {
      lastPickTap.current = null;
      selection.onInspect(instanceId);
      return;
    }
    lastPickTap.current = { instanceId, at: now };
    if (selection?.selectableInstanceIds.includes(instanceId)) selection.onToggle(instanceId);
  };

  const beginPick = (instanceId: string, event: React.PointerEvent) => {
    // No capture and no preventDefault: the row must stay pannable, exactly as it
    // is while a card is being dragged out of the hand.
    pointerPicked.current = null;
    pickPress.current = {
      pointerId: event.pointerId,
      instanceId,
      x: event.clientX,
      y: event.clientY,
      touch: event.pointerType !== "mouse",
    };
  };

  const finishPick = (instanceId: string, event: React.PointerEvent) => {
    const press = pickPress.current;
    pickPress.current = null;
    if (!press || press.pointerId !== event.pointerId || press.instanceId !== instanceId) return;
    const gesture = pressGesture({ dx: event.clientX - press.x, dy: event.clientY - press.y, touch: press.touch });
    if (gesture !== "press") {
      lastPickTap.current = null;
      return;
    }
    pointerPicked.current = instanceId;
    tapSelection(instanceId);
  };

  const cancelPick = () => {
    pickPress.current = null;
    lastPickTap.current = null;
  };

  return { pointerPicked, tapSelection, beginPick, finishPick, cancelPick };
}
