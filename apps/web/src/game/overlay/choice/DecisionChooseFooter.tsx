import type { DecisionResponse } from "@aegis/shared";
import { Button } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";
import { choiceLabel } from "./decisionChoiceLabels";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";

export function DecisionChooseFooter({
  choices,
  declineIndex,
  onRespond,
  onOpenBoard,
}: {
  choices: readonly string[];
  /** The entry that declines the optional effect; it renders last, apart from the options. */
  declineIndex?: number;
  onRespond: (response: DecisionResponse) => void;
  onOpenBoard: () => void;
}) {
  const { t } = useTranslation();
  const hasDecline = declineIndex !== undefined && declineIndex >= 0 && declineIndex < choices.length;
  return (
    <div className="decision-overlay__footer decision-overlay__choices">
      {choices.map((label, i) =>
        hasDecline && i === declineIndex ? null : (
          <Button
            key={i}
            full
            size="lg"
            variant={i === 0 ? "primary" : "secondary"}
            onClick={() => onRespond({ kind: "chooseOption", optionIndex: i })}
          >
            {choiceLabel({ choice: label, t })}
          </Button>
        ),
      )}
      {hasDecline ? (
        <Button
          full
          size="lg"
          variant="ghost"
          onClick={() => onRespond({ kind: "chooseOption", optionIndex: declineIndex })}
        >
          {t("overlay.notUse")}
        </Button>
      ) : null}
      <DecisionViewBoardButton onOpenBoard={onOpenBoard} />
    </div>
  );
}
