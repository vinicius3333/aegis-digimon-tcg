import { Button } from "../../../design/primitives";
import { useTranslation } from "../../../i18n";
import { useEffect, useId, useRef } from "react";
import type { EvoCostOption } from "../../digivolveModel";
import { CardArt } from "../CardArt";
import { printedCardName } from "../printedCardName";
import { useBoardPreview } from "./useBoardPreview";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";

export function EvoCostChoiceOverlay({
  evolvingCardId,
  baseName,
  options,
  onConfirm,
  onCancel,
}: {
  evolvingCardId: string;
  baseName: string;
  options: readonly EvoCostOption[];
  /** Receives the whole path, not just "is it alternate": a card can print several alternate
   * paths at different costs, and only the path's own index tells the server which one. */
  onConfirm: (option: EvoCostOption) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const { isViewingBoard, openBoard, boardReturn } = useBoardPreview();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isViewingBoard) panelRef.current?.focus();
  }, [isViewingBoard]);
  if (isViewingBoard) return boardReturn;

  return (
    <div
      className="combat-prompt evo-cost-prompt"
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="evo-cost-prompt__header">
        <CardArt cardId={evolvingCardId} width={56} />
        <div className="evo-cost-prompt__title">
          <div className="evo-cost-prompt__eyebrow">{t("overlay.digivolveCost")}</div>
          <div id={titleId} className="evo-cost-prompt__matchup">
            {printedCardName(evolvingCardId)} → {baseName}
          </div>
        </div>
      </div>

      <div className="evo-cost-prompt__options">
        {[...options]
          .sort((a, b) => a.cost - b.cost)
          .map((opt) => (
            <Button
              key={`${opt.type}:${opt.alternateRequirementIndex ?? -1}:${opt.label}`}
              full
              className="evo-cost-prompt__option"
              variant={opt.type === "alternate" ? "secondary" : "primary"}
              onClick={() => onConfirm(opt)}
            >
              {t("overlay.costMemory", { label: opt.label, cost: opt.cost })}
            </Button>
          ))}
      </div>

      <Button full variant="ghost" onClick={onCancel}>
        {t("common.cancel")}
      </Button>
      <DecisionViewBoardButton onOpenBoard={openBoard} />
    </div>
  );
}
