import type { DecisionResponse } from "@aegis/shared";
import { Button } from "../../../design/primitives";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";

export function DecisionOptionalFooter({
  onRespond,
  onOpenBoard,
}: {
  onRespond: (response: DecisionResponse) => void;
  onOpenBoard: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="game-actions-row decision-overlay__footer">
      <Button full size="lg" icon={Icons.Sparkles} onClick={() => onRespond({ kind: "optional", accept: true })}>
        {t("overlay.activate")}
      </Button>
      <Button full size="lg" variant="secondary" onClick={() => onRespond({ kind: "optional", accept: false })}>
        {t("overlay.decline")}
      </Button>
      <DecisionViewBoardButton onOpenBoard={onOpenBoard} />
    </div>
  );
}
