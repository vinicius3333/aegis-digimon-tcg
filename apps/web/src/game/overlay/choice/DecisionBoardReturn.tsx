import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { takeViewBoardOrigin } from "./DecisionViewBoardButton";

const VIEWPORT_MARGIN_PX = 16;

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high));

/**
 * Stands in for the decision panel while the player is looking at the board. The game
 * overlays normally live inside #aegis-stage, which is itself a fixed, overflow-clipped
 * viewport. Mobile browsers can therefore clip a fixed descendant after the board fills
 * 100dvh. Keep the only route back to the pending decision in the document viewport.
 *
 * Where it appears: centred on the View board button that opened the board, so going
 * back is one click in the same spot. Without that origin (a keyboard press, a board
 * prompt) it sits below the opponent bar, and phones always use that full-width strip.
 */
export function DecisionBoardReturn({
  returnControlRef,
  onReturn,
}: {
  returnControlRef: RefObject<HTMLDivElement | null>;
  onReturn: () => void;
}) {
  const { t } = useTranslation();
  const [origin] = useState(takeViewBoardOrigin);

  useLayoutEffect(() => {
    const control = returnControlRef.current;
    if (!origin || !control) return;
    const { width, height } = control.getBoundingClientRect();
    const left = clamp(origin.x - width / 2, VIEWPORT_MARGIN_PX, window.innerWidth - width - VIEWPORT_MARGIN_PX);
    const top = clamp(origin.y - height / 2, VIEWPORT_MARGIN_PX, window.innerHeight - height - VIEWPORT_MARGIN_PX);
    control.style.setProperty("--decision-return-left", `${left}px`);
    control.style.setProperty("--decision-return-top", `${top}px`);
  }, [origin, returnControlRef]);

  const returnControl = (
    <div
      ref={returnControlRef}
      className="decision-board-return"
      data-anchored={origin ? "" : undefined}
      style={{
        position: "fixed",
        zIndex: "calc(var(--ds-z-toast, 110) - 1)",
        ...(origin ? {} : { right: 16, top: "calc(env(safe-area-inset-top, 0px) + 64px)", bottom: "auto" }),
      }}
    >
      <span className="decision-board-return__status" aria-live="polite">
        {t("overlay.decisionPending")}
      </span>
      <Button icon={Icons.ArrowLeft} onClick={onReturn}>
        {t("overlay.returnToDecision")}
      </Button>
    </div>
  );
  return typeof document === "undefined" ? returnControl : createPortal(returnControl, document.body);
}
