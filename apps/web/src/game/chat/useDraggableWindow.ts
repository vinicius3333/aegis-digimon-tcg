import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";

export interface WindowPosition {
  left: number;
  top: number;
}

function clampToViewport(
  position: WindowPosition,
  size: { width: number; height: number },
  gutter: number,
): WindowPosition {
  const viewport = window.visualViewport;
  const left = (viewport?.offsetLeft ?? 0) + gutter;
  const top = (viewport?.offsetTop ?? 0) + gutter;
  const maxLeft = Math.max(
    left,
    (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) - size.width - gutter,
  );
  const maxTop = Math.max(
    top,
    (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - size.height - gutter,
  );
  return {
    left: Math.min(Math.max(position.left, left), maxLeft),
    top: Math.min(Math.max(position.top, top), maxTop),
  };
}

/** Fixed windows retain their stylesheet docking until the viewer moves their handle. */
export function useDraggableWindow(
  windowRef: RefObject<HTMLElement | null>,
  { viewportGutter = 4, resetKey }: { viewportGutter?: number; resetKey?: string } = {},
) {
  const [placed, setPlaced] = useState<{ position: WindowPosition; key?: string }>();
  const position = placed?.key === resetKey ? placed?.position : undefined;
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number; key?: string }>(undefined);

  useEffect(() => {
    dragRef.current = undefined;
    setPlaced(undefined);
  }, [resetKey]);

  const onHandlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const element = windowRef.current;
      const interactive = (event.target as Element).closest("button, a, input, select, textarea");
      if (!element || event.button !== 0 || (interactive && interactive !== event.currentTarget)) return;
      const rect = element.getBoundingClientRect();
      dragRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        key: resetKey,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    },
    [windowRef, resetKey],
  );

  const onHandlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      const element = windowRef.current;
      if (!drag || drag.key !== resetKey || drag.pointerId !== event.pointerId || !element) return;
      setPlaced({
        key: resetKey,
        position: clampToViewport(
          { left: event.clientX - drag.offsetX, top: event.clientY - drag.offsetY },
          element.getBoundingClientRect(),
          viewportGutter,
        ),
      });
    },
    [windowRef, resetKey, viewportGutter],
  );

  const onHandlePointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = undefined;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const keepOnScreen = useCallback(() => {
    const element = windowRef.current;
    if (!element) return;
    setPlaced((current) => {
      if (!current || current.key !== resetKey) return current;
      const clamped = clampToViewport(current.position, element.getBoundingClientRect(), viewportGutter);
      return clamped.left === current.position.left && clamped.top === current.position.top
        ? current
        : { position: clamped, key: resetKey };
    });
  }, [windowRef, resetKey, viewportGutter]);

  const moveBy = useCallback(
    (x: number, y: number) => {
      const element = windowRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      setPlaced({
        key: resetKey,
        position: clampToViewport({ left: rect.left + x, top: rect.top + y }, rect, viewportGutter),
      });
    },
    [windowRef, resetKey, viewportGutter],
  );

  const resetPosition = useCallback(() => {
    dragRef.current = undefined;
    setPlaced(undefined);
  }, []);

  // Rotation, browser resizing, and changes to the panel must keep its controls reachable.
  useEffect(() => {
    window.addEventListener("resize", keepOnScreen);
    window.visualViewport?.addEventListener("resize", keepOnScreen);
    window.visualViewport?.addEventListener("scroll", keepOnScreen);
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(keepOnScreen);
    if (windowRef.current) observer?.observe(windowRef.current);
    return () => {
      window.removeEventListener("resize", keepOnScreen);
      window.visualViewport?.removeEventListener("resize", keepOnScreen);
      window.visualViewport?.removeEventListener("scroll", keepOnScreen);
      observer?.disconnect();
    };
  }, [keepOnScreen, windowRef]);

  return {
    position,
    keepOnScreen,
    moveBy,
    resetPosition,
    handleProps: {
      onPointerDown: onHandlePointerDown,
      onPointerMove: onHandlePointerMove,
      onPointerUp: onHandlePointerUp,
      onPointerCancel: onHandlePointerUp,
    },
  };
}
