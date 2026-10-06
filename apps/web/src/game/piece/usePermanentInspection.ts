import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { pressGesture, swallowNextClick } from "../pressGesture";

const INSPECT_HOLD_MS = 400;

/** A still touch reads the card, including when the press lands on a badge. */
export function usePermanentInspection(onInspect: (() => void) | undefined) {
  const inspectRef = useRef(onInspect);
  inspectRef.current = onInspect;
  const timer = useRef<number | undefined>(undefined);
  const press = useRef<{ pointerId: number; x: number; y: number; inspected: boolean } | undefined>(undefined);
  const cancel = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    press.current = undefined;
  }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const active = press.current;
      if (!active || active.pointerId !== event.pointerId || active.inspected) return;
      if (pressGesture({ dx: event.clientX - active.x, dy: event.clientY - active.y, touch: true }) !== "press")
        cancel();
    };
    const up = (event: PointerEvent) => {
      if (press.current?.pointerId !== event.pointerId) return;
      // The panel can open underneath the held finger. Its release must not click it.
      if (press.current.inspected) swallowNextClick();
      cancel();
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel, true);
    return () => {
      cancel();
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
    };
  }, [cancel]);

  return (event: ReactPointerEvent) => {
    cancel();
    if (!onInspect || event.pointerType !== "touch") return;
    if (event.target instanceof Element && event.target.closest("button")) return;
    press.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, inspected: false };
    timer.current = window.setTimeout(() => {
      if (!press.current || !inspectRef.current) return;
      press.current.inspected = true;
      inspectRef.current();
    }, INSPECT_HOLD_MS);
  };
}
