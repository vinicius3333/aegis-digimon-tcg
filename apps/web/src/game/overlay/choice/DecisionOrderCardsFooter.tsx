import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";

export function DecisionOrderCardsFooter({
  onConfirm,
  onOpenBoard,
}: {
  onConfirm: () => void;
  onOpenBoard: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="game-actions-row decision-overlay__footer">
      <Button full size="lg" icon={Icons.Check} onClick={onConfirm}>
        {t("overlay.confirmOrder")}
      </Button>
      <DecisionViewBoardButton onOpenBoard={onOpenBoard} />
    </div>
  );
}
