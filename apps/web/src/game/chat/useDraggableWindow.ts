import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";

export interface WindowPosition {
  left: number;
  top: number;
}

const VIEWPORT_GUTTER_PX = 4;

function clampToViewport(position: WindowPosition, size: { width: number; height: number }): WindowPosition {
  const maxLeft = Math.max(VIEWPORT_GUTTER_PX, window.innerWidth - size.width - VIEWPORT_GUTTER_PX);
  const maxTop = Math.max(VIEWPORT_GUTTER_PX, window.innerHeight - size.height - VIEWPORT_GUTTER_PX);
  return {
    left: Math.min(Math.max(position.left, VIEWPORT_GUTTER_PX), maxLeft),
    top: Math.min(Math.max(position.top, VIEWPORT_GUTTER_PX), maxTop),
  };
}

/**
 * Lets a fixed-position window be dragged by a handle and keeps it on screen. The position
 * stays `undefined` until the first drag, so the stylesheet decides where the window docks.
 */
export function useDraggableWindow(windowRef: RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<WindowPosition>();
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number }>(undefined);

  const onHandlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const element = windowRef.current;
      if (!element || event.button !== 0 || (event.target as Element).closest("button")) return;
      const rect = element.getBoundingClientRect();
      dragRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [windowRef],
  );

  const onHandlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      const element = windowRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !element) return;
      const rect = element.getBoundingClientRect();
      setPosition(clampToViewport({ left: event.clientX - drag.offsetX, top: event.clientY - drag.offsetY }, rect));
    },
    [windowRef],
  );

  const onHandlePointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = undefined;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const keepOnScreen = useCallback(() => {
    const element = windowRef.current;
    if (!element) return;
    setPosition((current) => {
      if (!current) return current;
      const clamped = clampToViewport(current, element.getBoundingClientRect());
      return clamped.left === current.left && clamped.top === current.top ? current : clamped;
    });
  }, [windowRef]);

  // A rotated phone or a resized browser must not leave the window off screen.
  useEffect(() => {
    window.addEventListener("resize", keepOnScreen);
    return () => window.removeEventListener("resize", keepOnScreen);
  }, [keepOnScreen]);

  return {
    position,
    keepOnScreen,
    handleProps: {
      onPointerDown: onHandlePointerDown,
      onPointerMove: onHandlePointerMove,
      onPointerUp: onHandlePointerUp,
      onPointerCancel: onHandlePointerUp,
    },
  };
}
