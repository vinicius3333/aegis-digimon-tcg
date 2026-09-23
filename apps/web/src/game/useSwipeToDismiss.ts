import { useRef, useState, type MouseEvent, type PointerEvent } from "react";

/** How far, as a share of the element's width, a drag must travel to dismiss on release. */
const DISMISS_DISTANCE_RATIO = 0.35;
/** A quick flick dismisses even when it travels less than the distance above (px per ms). */
const DISMISS_FLICK_SPEED = 0.6;
/** Movement below this is still a tap, so the element's click keeps working. */
const DRAG_START_PX = 8;
const EXIT_MS = 180;

type SwipeState = { offset: number; phase: "idle" | "dragging" | "settling" | "leaving"; width: number };

/**
 * A horizontal swipe that throws an element off either side, the way a phone clears a
 * notification. Vertical movement is left to the page (`touch-action: pan-y` on the element),
 * and a drag swallows the click that would otherwise follow it.
 */
export function useSwipeToDismiss(onDismiss: () => void) {
  const [state, setState] = useState<SwipeState>({ offset: 0, phase: "idle", width: 1 });
  const gesture = useRef<{ pointerId: number; startX: number; startTime: number; width: number } | null>(null);
  const dragged = useRef(false);

  const release = (event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (current === null || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    const offset = event.clientX - current.startX;
    const speed = Math.abs(offset) / Math.max(1, event.timeStamp - current.startTime);
    const farEnough = Math.abs(offset) >= current.width * DISMISS_DISTANCE_RATIO;
    const flicked = dragged.current && speed >= DISMISS_FLICK_SPEED;
    if (farEnough || flicked) {
      setState({ offset: Math.sign(offset || 1) * current.width * 1.2, phase: "leaving", width: current.width });
      window.setTimeout(onDismiss, EXIT_MS);
    } else {
      setState({ offset: 0, phase: "settling", width: current.width });
    }
  };

  return {
    offset: state.offset,
    /** 1 at rest, fading toward 0 as the element nears the dismiss distance. */
    fade: Math.max(0, 1 - Math.abs(state.offset) / state.width),
    phase: state.phase,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (state.phase === "leaving" || (event.pointerType === "mouse" && event.button !== 0)) return;
        dragged.current = false;
        gesture.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startTime: event.timeStamp,
          width: Math.max(1, event.currentTarget.getBoundingClientRect().width),
        };
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const current = gesture.current;
        if (current === null || current.pointerId !== event.pointerId) return;
        const offset = event.clientX - current.startX;
        if (!dragged.current) {
          if (Math.abs(offset) < DRAG_START_PX) return;
          dragged.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        setState({ offset, phase: "dragging", width: current.width });
      },
      onPointerUp: release,
      onPointerCancel: (event: PointerEvent<HTMLElement>) => {
        if (gesture.current?.pointerId !== event.pointerId) return;
        gesture.current = null;
        setState((previous) => ({ ...previous, offset: 0, phase: "settling" }));
      },
      onClickCapture: (event: MouseEvent<HTMLElement>) => {
        if (!dragged.current) return;
        dragged.current = false;
        event.preventDefault();
        event.stopPropagation();
      },
    },
  };
}
