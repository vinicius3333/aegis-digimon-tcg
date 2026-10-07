import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";

let pressedAt: { x: number; y: number } | undefined;

/**
 * Where the player last pressed View board, read once by the control that replaces the
 * panel, so Return to decision appears under the same pointer instead of across the screen.
 */
export function takeViewBoardOrigin(): { x: number; y: number } | undefined {
  const origin = pressedAt;
  pressedAt = undefined;
  return origin;
}

export function DecisionViewBoardButton({ onOpenBoard }: { onOpenBoard: () => void }) {
  const { t } = useTranslation();
  return (
    <Button
      className="decision-overlay__view-board"
      size="lg"
      variant="secondary"
      icon={Icons.Map}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pressedAt = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }}
      onClick={onOpenBoard}
    >
      <span className="decision-overlay__view-board-label">{t("overlay.viewBoard")}</span>
    </Button>
  );
}
