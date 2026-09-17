import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";

export function DecisionViewBoardButton({ onOpenBoard }: { onOpenBoard: () => void }) {
  const { t } = useTranslation();
  return (
    <Button
      className="decision-overlay__view-board"
      size="lg"
      variant="secondary"
      icon={Icons.Map}
      onClick={onOpenBoard}
    >
      <span className="decision-overlay__view-board-label">{t("overlay.viewBoard")}</span>
    </Button>
  );
}
