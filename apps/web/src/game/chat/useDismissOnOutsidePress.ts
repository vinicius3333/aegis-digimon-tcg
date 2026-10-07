import { useEffect, type RefObject } from "react";

/** Closes a pop-up on a press outside it. A press on its own button toggles it instead. */
export function useDismissOnOutsidePress(
  popupRef: RefObject<HTMLElement | null>,
  anchor: HTMLElement | null,
  onClose: () => void,
): void {
  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (popupRef.current?.contains(target) || anchor?.contains(target)) return;
      onClose();
    };
    document.addEventListener("pointerdown", closeOnOutsidePress, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress, true);
  }, [popupRef, anchor, onClose]);
}
