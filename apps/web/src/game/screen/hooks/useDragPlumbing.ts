/* Dragging a card, from the press that might become one to the release that sends an
   intent.

   The pointer is left to the browser until `move` decides between a sideways swipe —
   which is how the hand scrolls on touch — and a real drag. Claiming it up front
   (preventDefault plus capture) would kill the native pan, so both are deferred until
   the gesture is known. A press that never moves is a tap, and the click the browser
   sends after it is swallowed: a sheet opened under the finger would otherwise be
   dismissed, or the card behind it zoomed, by that same click.

   `dragRef` shadows the drag state because the window listeners are registered once and
   would otherwise close over the first render's value. */

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { CardKind, getCardDefinition, type Permanent } from "@aegis/shared";
import { pressGesture, swallowNextClick } from "../../pressGesture";
import { dropZoneAt } from "../dropZones";
import { DragKind } from "../enums";
import type { DragState, DropZoneHit } from "../types";
import type { HandEntry } from "../../piece";

export function useDragPlumbing() {
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  const setDrag = (d: DragState | null) => {
    dragRef.current = d;
    setDragState(d);
  };
  /** Assigned every render, so the listeners below reach the current handlers. */
  const handleTapRef = useRef<((d: DragState) => void) | null>(null);
  const handleDropRef = useRef<((d: DragState, cx: number, cy: number) => void) | null>(null);
  // The drop area the pointer is currently over, so the ghost can carry the name
  // of the intent that release would send.
  const [dragHover, setDragHover] = useState<DropZoneHit | null>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      // `deferred` is set for every non-mouse pointer, so it also says which slop applies.
      const gesture = pressGesture({ dx: e.clientX - d.ox, dy: e.clientY - d.oy, touch: d.deferred === true });
      if (!d.started && gesture === "press") {
        setDrag({ ...d, x: e.clientX, y: e.clientY });
        return;
      }
      if (!d.started) {
        if (gesture === "scroll") {
          setDrag(null);
          return;
        }
        e.preventDefault();
        d.capture?.setPointerCapture?.(e.pointerId);
      }
      setDrag({ ...d, x: e.clientX, y: e.clientY, started: true });
      const hit = dropZoneAt(e.clientX, e.clientY);
      setDragHover((current) => (current?.target === hit?.target && current?.id === hit?.id ? current : (hit ?? null)));
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (d) {
        if (d.started) handleDropRef.current?.(d, e.clientX, e.clientY);
        else {
          swallowNextClick();
          handleTapRef.current?.(d);
        }
      }
      setDrag(null);
      setDragHover(null);
    };
    const cancel = () => {
      setDrag(null);
      setDragHover(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The index is a position in the hand the viewer can see, so the entry is resolved there. */
  function startHandDrag(index: number, entry: HandEntry | undefined, e: ReactPointerEvent) {
    if (!entry) return;
    const deferred = e.pointerType !== "mouse";
    if (!deferred) {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setDrag({
      kind: DragKind.Play,
      index,
      instanceId: entry.instanceId,
      cardId: entry.cardId,
      artId: entry.artId,
      x: e.clientX,
      y: e.clientY,
      ox: e.clientX,
      oy: e.clientY,
      started: false,
      deferred,
      capture: e.currentTarget,
    });
  }

  function startPermDrag(perm: Permanent, e: ReactPointerEvent) {
    if (perm.isSuspended) return;
    const def = perm.topCard ? getCardDefinition(perm.topCard.cardId) : undefined;
    if (!def?.kinds.includes(CardKind.Digimon)) return;
    const deferred = e.pointerType !== "mouse";
    if (!deferred) {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setDrag({
      kind: DragKind.Attack,
      permanentId: perm.permanentId,
      cardId: perm.topCard?.cardId ?? "",
      artId: perm.topCard?.artId,
      x: e.clientX,
      y: e.clientY,
      ox: e.clientX,
      oy: e.clientY,
      started: false,
      deferred,
      capture: e.currentTarget,
    });
  }

  return { drag, dragHover, handleTapRef, handleDropRef, startHandDrag, startPermDrag };
}
