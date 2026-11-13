import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { recordViewBoardOrigin } from "@/game/overlay/choice/recordViewBoardOrigin";

type Params = { onOpenBoard: () => void };

export function DecisionViewBoardButton({ onOpenBoard }: Params) {
  const { t } = useTranslation();
  return (
    <Button
      className="decision-overlay__view-board"
      size="lg"
      variant="secondary"
      icon={Icons.Map}
      onClick={(event) => {
        recordViewBoardOrigin({ element: event.currentTarget });
        onOpenBoard();
      }}
    >
      <span className="decision-overlay__view-board-label">{t("overlay.viewBoard")}</span>
    </Button>
  );
}
