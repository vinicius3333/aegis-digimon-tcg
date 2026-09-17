import type { DecisionResponse } from "@aegis/shared";
import { Button } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";
import { choiceLabel } from "./decisionChoiceLabels";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";

export function DecisionChooseFooter({
  choices,
  onRespond,
  onOpenBoard,
}: {
  choices: readonly string[];
  onRespond: (response: DecisionResponse) => void;
  onOpenBoard: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="decision-overlay__footer decision-overlay__choices">
      {choices.map((label, i) => (
        <Button
          key={i}
          full
          size="lg"
          variant={i === 0 ? "primary" : "secondary"}
          onClick={() => onRespond({ kind: "chooseOption", optionIndex: i })}
        >
          {choiceLabel({ choice: label, t })}
        </Button>
      ))}
      <DecisionViewBoardButton onOpenBoard={onOpenBoard} />
    </div>
  );
}
