import type { DecisionRequest } from "@aegis/shared";
import { CardFull } from "../../../design/cards";
import { Icons } from "../../../design/icons";
import { useTranslation } from "../../../i18n";
import "./decisionDigivolveCostChoice.css";

type DigivolveCostChoice = NonNullable<NonNullable<DecisionRequest["options"]>["digivolveCostChoice"]>;

const CARD_WIDTH = 112;

/**
 * Which digivolution requirement an effect-driven digivolution uses: the card it evolves
 * from and into, then one button per requirement with the cost the player will pay. The
 * effect's own reduction is spelled out ("4 − 2 = 2"), and the cheapest route leads.
 */
export function DecisionDigivolveCostChoice({
  choice,
  onChoose,
  onViewBoard,
}: {
  choice: DigivolveCostChoice;
  onChoose: (optionIndex: number) => void;
  onViewBoard: () => void;
}) {
  const { t } = useTranslation();
  const finalCosts = choice.costs.map((cost) => Math.max(0, cost + choice.costDelta));
  const cheapest = Math.min(...finalCosts);
  const requirementLabels = [t("overlay.printedRequirement"), t("overlay.alternateRequirement")];
  return (
    <div className="digivolve-cost-choice">
      <h2 className="digivolve-cost-choice__title">{t("game.digivolve")}</h2>
      <div className="digivolve-cost-choice__cards">
        <CardFull cardId={choice.fromCardId} width={CARD_WIDTH} />
        <span className="digivolve-cost-choice__arrow" aria-hidden="true">
          <Icons.ArrowRight size={28} />
        </span>
        <CardFull cardId={choice.intoCardId} artId={choice.intoArtId} width={CARD_WIDTH} />
      </div>
      <div className="digivolve-cost-choice__options">
        {choice.costs.map((cost, index) => {
          const finalCost = finalCosts[index]!;
          const math =
            choice.costDelta === 0
              ? `${cost}`
              : `${cost} ${choice.costDelta < 0 ? "−" : "+"} ${Math.abs(choice.costDelta)} = ${finalCost}`;
          return (
            <button
              key={index}
              type="button"
              className="digivolve-cost-choice__option"
              data-recommended={finalCost === cheapest ? true : undefined}
              aria-label={t("overlay.requirementCost", {
                requirement: requirementLabels[index] ?? "",
                cost: finalCost,
              })}
              onClick={() => onChoose(index)}
            >
              <span>{requirementLabels[index]}</span>
              <span className="digivolve-cost-choice__cost">{math}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="digivolve-cost-choice__view-board" onClick={onViewBoard}>
        <Icons.Map size={18} />
        {t("overlay.viewBoard")}
      </button>
    </div>
  );
}
