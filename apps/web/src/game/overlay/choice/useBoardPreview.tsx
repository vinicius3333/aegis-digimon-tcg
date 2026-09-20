import { useEffect, useRef, useState } from "react";
import { DecisionBoardReturn } from "./DecisionBoardReturn";

/** Local inspection only: never answers the game decision or clears the caller's picks. */
export function useBoardPreview() {
  const [isViewingBoard, setIsViewingBoard] = useState(false);
  const returnControlRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (isViewingBoard) returnControlRef.current?.querySelector("button")?.focus();
    else if (previousFocus.current?.isConnected) previousFocus.current.focus();
  }, [isViewingBoard]);
  return {
    isViewingBoard,
    openBoard: () => {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setIsViewingBoard(true);
    },
    boardReturn: <DecisionBoardReturn returnControlRef={returnControlRef} onReturn={() => setIsViewingBoard(false)} />,
  };
}
