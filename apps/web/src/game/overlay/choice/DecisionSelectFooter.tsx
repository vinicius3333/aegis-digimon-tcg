import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";

export function DecisionSelectFooter({
  canConfirm,
  onConfirm,
  min,
  onNone,
  onOpenBoard,
}: {
  canConfirm: boolean;
  onConfirm: () => void;
  min: number;
  onNone: () => void;
  onOpenBoard: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="game-actions-row decision-overlay__footer">
      <Button full size="lg" icon={Icons.Check} disabled={!canConfirm} onClick={onConfirm}>
        {t("overlay.confirmTargets")}
      </Button>
      {min === 0 ? (
        <Button full size="lg" variant="ghost" onClick={onNone}>
          {t("common.none")}
        </Button>
      ) : null}
      <DecisionViewBoardButton onOpenBoard={onOpenBoard} />
    </div>
  );
}
