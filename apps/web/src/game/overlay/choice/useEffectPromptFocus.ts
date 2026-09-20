import { useEffect, useRef, type KeyboardEvent } from "react";
import { trapDialogFocus } from "./decisionFocusTrap";

/** Keep keyboard navigation inside a material or action decision until it is answered. */
export function useEffectPromptFocus(isViewingBoard = false) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isViewingBoard) panelRef.current?.focus();
  }, [isViewingBoard]);
  return {
    ref: panelRef,
    tabIndex: -1,
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => trapDialogFocus({ event, panelRef }),
  };
}
