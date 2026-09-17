import { type RefObject } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";

/**
 * Stands in for the decision panel while the player is looking at the board. The game
 * overlays normally live inside #aegis-stage, which is itself a fixed, overflow-clipped
 * viewport. Mobile browsers can therefore clip a fixed descendant after the board fills
 * 100dvh. Keep the only route back to the pending decision in the document viewport,
 * below the opponent bar instead of beside browser chrome at the bottom edge.
 */
export function DecisionBoardReturn({
  returnControlRef,
  onReturn,
}: {
  returnControlRef: RefObject<HTMLDivElement | null>;
  onReturn: () => void;
}) {
  const { t } = useTranslation();
  const returnControl = (
    <div
      ref={returnControlRef}
      className="decision-board-return"
      style={{
        position: "fixed",
        zIndex: "calc(var(--ds-z-toast, 110) - 1)",
        right: 16,
        top: "calc(env(safe-area-inset-top, 0px) + 64px)",
        bottom: "auto",
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
