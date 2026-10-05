import { useEffect, useRef, useState } from "react";
import { printedModalPreamble, type DecisionRequest, type DecisionResponse } from "@aegis/shared";
import { CardMini } from "../../../design/cards";
import { Icons } from "../../../design/icons";
import { Button } from "../../../design/primitives";
import { useMediaQuery, WIDE_DIALOG_QUERY } from "../../../design/useMediaQuery";
import { useTranslation } from "../../../i18n";
import { useCardOpener } from "../../cardLinks";
import { decisionSelectionMin } from "../../decisionPresentation";
import { pendingFateBadge } from "../../pendingFate";
import { playerFacingEffectClause, playerFacingPromptText } from "../effectText";
import { printedCardName } from "../printedCardName";
import type { TriggerDetail } from "../types";
import { DecisionBoardReturn } from "./DecisionBoardReturn";
import { DecisionCandidateGrid } from "./DecisionCandidateGrid";
import { DecisionChoiceCards } from "./DecisionChoiceCards";
import { DecisionChooseFooter } from "./DecisionChooseFooter";
import { DecisionClauseChoice } from "./DecisionClauseChoice";
import { DecisionDigivolveCostChoice } from "./DecisionDigivolveCostChoice";
import { DecisionEffectChoice } from "./DecisionEffectChoice";
import { trapDialogFocus } from "./decisionFocusTrap";
import { DecisionOptionalFooter } from "./DecisionOptionalFooter";
import { DecisionOrderCardsFooter } from "./DecisionOrderCardsFooter";
import { DecisionOrderCardsPanel } from "./DecisionOrderCardsPanel";
import { totalPlayCost } from "./decisionPlayCost";
import { totalDP } from "./decisionDpBudget";
import { DecisionSelectFooter } from "./DecisionSelectFooter";
import { DecisionTriggerChooser, type WaitingTrigger } from "./DecisionTriggerChooser";
import type { DecisionCandidate } from "./decisionTypes";
import "../effectPromptFamily.css";

/** The art of the card asking the question, big enough to recognise beside its clause. */
const DECISION_SOURCE_ART_WIDTH = 64;

type DialogWidthParams = {
  docksOnRail: boolean;
  isResolutionPlan: boolean;
  wideDialog: boolean;
  itemCount: number;
};

/** A choice or yes/no prompt docks on the left rail at its own width (redesignArena.css). */
function dialogWidth({ docksOnRail, isResolutionPlan, wideDialog, itemCount }: DialogWidthParams): number | undefined {
  if (docksOnRail) return undefined;
  if (isResolutionPlan) return 760;
  if (wideDialog && itemCount > 3) return 1000;
  return 560;
}

/** Sibling of the scrolling sheet, so its entrance transform cannot crop the arena shade. */
function DecisionBackdrop({ side = false }: { side?: boolean }) {
  return (
    <div className={`decision-overlay-backdrop${side ? " decision-overlay-backdrop--side" : ""}`} aria-hidden="true" />
  );
}

export function DecisionOverlay({
  request,
  sourceCardId,
  candidates,
  picks,
  triggerDetails = [],
  onTogglePick,
  onRespond,
  onChangeSourceHost,
}: {
  request: DecisionRequest;
  sourceCardId?: string;
  candidates: DecisionCandidate[];
  picks: string[];
  /** Aligned to `request.options.triggerKeys`; empty means the chooser shows names only. */
  triggerDetails?: readonly TriggerDetail[];
  onTogglePick: (instanceId: string) => void;
  onRespond: (response: DecisionResponse) => void;
  /**
   * Set when the pick is narrowed to one Digimon's digivolution cards: the dialog then shows
   * only those cards, without the effect text, and offers to go back to choosing a Digimon.
   */
  onChangeSourceHost?: () => void;
}) {
  const { t } = useTranslation();
  const openCard = useCardOpener();
  const wideDialog = useMediaQuery(WIDE_DIALOG_QUERY);
  const min = decisionSelectionMin(request);
  const max = request.options?.max ?? 1;
  const choices = request.options?.choices ?? [];
  const choiceEffects = request.options?.choiceEffects;
  const declineIndex = request.options?.declineIndex;
  const choiceClauses = request.options?.choiceClauses;
  const isOptional = request.kind === "optional";
  const isChoose = request.kind === "chooseOption";
  const docksOnRail = isChoose || isOptional;
  const choosesPrintedBullet =
    isChoose &&
    choiceEffects === undefined &&
    choiceClauses !== undefined &&
    choiceClauses.length === choices.length &&
    choiceClauses.some(Boolean);
  const isSelect = request.kind === "chooseTargets" || request.kind === "selectCards";
  const isOrderCards = request.kind === "orderCards";
  const isOrderTriggers = request.kind === "orderTriggers";
  const isResolutionPlan = isOrderTriggers && request.options?.acceptsResolutionPlan === true;
  const triggerKeys = request.options?.triggerKeys ?? [];
  const triggerCardIds = request.options?.triggerCardIds ?? [];
  const maxTotalPlayCost = request.options?.maxTotalPlayCost;
  const selectedPlayCost = totalPlayCost({ picks, candidates });
  const withinPlayCostBudget = maxTotalPlayCost === undefined || selectedPlayCost <= maxTotalPlayCost;
  const maxTotalDP = request.options?.maxTotalDP;
  const selectedDP = totalDP({
    picks,
    dpOf: (id) => candidates.find((candidate) => candidate.instanceId === id)?.currentDP,
  });
  const withinDPBudget = maxTotalDP === undefined || selectedDP <= maxTotalDP;
  const canConfirm = picks.length >= min && picks.length <= max && withinPlayCostBudget && withinDPBudget;
  // The fate every picked target meets, or nothing when the engine did not
  // project one for the action that raised this prompt.
  const fateBadge = request.options?.targetFate ? pendingFateBadge(request.options.targetFate) : undefined;

  const [isViewingBoard, setIsViewingBoard] = useState(false);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnControlRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setIsViewingBoard(false);
  }, [request.decisionId]);
  useEffect(() => {
    setCardOrder(candidates.map((candidate) => candidate.instanceId));
  }, [request.decisionId]);
  useEffect(() => {
    if (isViewingBoard) returnControlRef.current?.querySelector("button")?.focus();
    else panelRef.current?.focus();
  }, [isViewingBoard]);

  const moveOrderedCard = (index: number, delta: -1 | 1) => {
    setCardOrder((current) => {
      const destination = index + delta;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination]!, next[index]!];
      return next;
    });
  };

  const confirmSelect = () => {
    if (request.kind === "selectCards") onRespond({ kind: "selectCards", instanceIds: picks });
    else onRespond({ kind: "chooseTargets", instanceIds: picks });
  };

  const sourceClause = sourceCardId
    ? playerFacingEffectClause({
        cardId: sourceCardId,
        timing: request.options?.timing,
        description: request.options?.effectText,
        effectTextPart: request.options?.effectTextPart,
        isInherited: request.options?.isInherited,
      })
    : undefined;
  // Each bullet is spelled out on its own option, so the header keeps only the lead-in.
  const sourceEffectText =
    choosesPrintedBullet && sourceClause !== undefined ? printedModalPreamble(sourceClause) : sourceClause;
  /* The dialog is named by a plain string rather than by its visible title: that title
     now carries the source card as a link, and an aria-labelledby would read the link's
     own label ("Open …") in place of the card's name. */
  const dialogLabel = sourceCardId
    ? t("overlay.cardEffect", { name: printedCardName(sourceCardId) })
    : t("overlay.effect");

  // A choice with a decline entry is an optional effect asking which way to use it.
  const genericPrompt = t(
    isOptional || (isChoose && declineIndex !== undefined)
      ? "overlay.useEffectPrompt"
      : isChoose
        ? "overlay.chooseEffectPrompt"
        : isOrderCards
          ? "overlay.chooseCardOrderPrompt"
          : "overlay.resolveEffect",
  );
  // The eyebrow above already names the source card; repeating it as the title says nothing twice.
  const specificPrompt = playerFacingPromptText(request.promptText, request.kind);
  const promptText =
    request.options?.promptKey === "activateBlitz"
      ? t("overlay.activateBlitzPrompt")
      : !specificPrompt || (sourceCardId && specificPrompt === printedCardName(sourceCardId))
        ? genericPrompt
        : specificPrompt;

  if (isViewingBoard) {
    return <DecisionBoardReturn returnControlRef={returnControlRef} onReturn={() => setIsViewingBoard(false)} />;
  }

  const digivolveCostChoice = isChoose ? request.options?.digivolveCostChoice : undefined;
  if (digivolveCostChoice !== undefined && digivolveCostChoice.costs.length === choices.length) {
    return (
      <>
        <DecisionBackdrop side />
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={t("game.digivolve")}
          className="game-modal__panel game-modal__panel--bare decision-overlay effect-prompt-family decision-overlay--side"
          onKeyDown={(event) => trapDialogFocus({ event, panelRef })}
        >
          <DecisionDigivolveCostChoice
            choice={digivolveCostChoice}
            onChoose={(optionIndex) => onRespond({ kind: "chooseOption", optionIndex })}
            onViewBoard={() => setIsViewingBoard(true)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <DecisionBackdrop side={docksOnRail} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={dialogLabel}
        className={`game-modal__panel game-modal__panel--bare decision-overlay effect-prompt-family${wideDialog ? " decision-overlay--wide" : ""}${isSelect ? " decision-overlay--selection" : ""}${isOrderTriggers ? " decision-overlay--trigger-chooser" : ""}${isResolutionPlan ? " decision-overlay--resolution-plan" : ""}${docksOnRail ? " decision-overlay--side" : ""}`}
        onKeyDown={(event) => trapDialogFocus({ event, panelRef })}
        /* Geometry, surface and entrance all live in game.css: inline values could not be
         overridden by the phone bottom-sheet rules, and an inline `animation` shorthand
         hid both the shared `--t-dialog-in` timing and the reduced-motion override. */
        style={{
          width: dialogWidth({
            docksOnRail,
            isResolutionPlan,
            wideDialog,
            itemCount: Math.max(candidates.length, triggerKeys.length),
          }),
        }}
      >
        {/* Artwork and the question share the same compact header as combat prompts. */}
        <div className="decision-overlay__header">
          {sourceCardId ? (
            /* The art is now the only mention of the card, so it carries the link that the
             spelled-out name used to: same route to the full card, one less line to read. */
            openCard ? (
              <button
                type="button"
                className="decision-overlay__source-art"
                aria-label={t("feed.openCard", { card: printedCardName(sourceCardId) })}
                onClick={() => openCard(sourceCardId)}
              >
                <CardMini cardId={sourceCardId} width={DECISION_SOURCE_ART_WIDTH} zoomOnHover={false} />
              </button>
            ) : (
              <span className="decision-overlay__source-art" aria-hidden="true">
                <CardMini cardId={sourceCardId} width={DECISION_SOURCE_ART_WIDTH} zoomOnHover={false} />
              </span>
            )
          ) : null}
          <div className="decision-overlay__question">
            <div className="decision-overlay__heading">
              <h2 className="decision-overlay__title">
                {isResolutionPlan ? t("overlay.orderPendingEffects") : promptText}
              </h2>
            </div>
            {!isOrderTriggers && sourceEffectText && onChangeSourceHost === undefined ? (
              <p className="decision-overlay__effect-text">{sourceEffectText}</p>
            ) : null}
            {onChangeSourceHost ? (
              <Button size="sm" variant="ghost" icon={Icons.ArrowLeft} onClick={onChangeSourceHost}>
                {t("overlay.chooseAnotherSourceHost")}
              </Button>
            ) : null}
          </div>
        </div>

        {isSelect ? (
          <DecisionCandidateGrid
            candidates={candidates}
            picks={picks}
            min={min}
            max={max}
            maxTotalPlayCost={maxTotalPlayCost}
            selectedPlayCost={selectedPlayCost}
            withinPlayCostBudget={withinPlayCostBudget}
            maxTotalDP={maxTotalDP}
            selectedDP={selectedDP}
            wideDialog={wideDialog}
            fateBadge={fateBadge}
            onTogglePick={onTogglePick}
          />
        ) : null}

        {isOrderCards ? (
          <DecisionOrderCardsPanel
            candidates={candidates}
            cardOrder={cardOrder}
            wideDialog={wideDialog}
            orderDestination={request.options?.orderDestination}
            onMove={moveOrderedCard}
          />
        ) : null}

        {/* A choice about revealed cards shows them; the player must not decide blind. */}
        {isChoose && choiceEffects === undefined && candidates.length > 0 ? (
          <DecisionChoiceCards candidates={candidates} wideDialog={wideDialog} />
        ) : null}

        {isChoose && choiceEffects !== undefined ? (
          <DecisionEffectChoice
            choices={choices}
            choiceEffects={choiceEffects}
            wideDialog={wideDialog}
            onRespond={onRespond}
            onOpenBoard={() => setIsViewingBoard(true)}
          />
        ) : choosesPrintedBullet ? (
          <DecisionClauseChoice
            choices={choices}
            choiceClauses={choiceClauses}
            declineIndex={declineIndex}
            onRespond={onRespond}
            onOpenBoard={() => setIsViewingBoard(true)}
          />
        ) : isChoose ? (
          <DecisionChooseFooter
            choices={choices}
            declineIndex={declineIndex}
            topBottomZone={request.options?.topBottomZone}
            onRespond={onRespond}
            onOpenBoard={() => setIsViewingBoard(true)}
          />
        ) : null}

        {isOptional ? (
          <DecisionOptionalFooter onRespond={onRespond} onOpenBoard={() => setIsViewingBoard(true)} />
        ) : null}

        {isSelect ? (
          <DecisionSelectFooter
            canConfirm={canConfirm}
            onConfirm={confirmSelect}
            min={min}
            onNone={() =>
              onRespond({ kind: request.kind === "selectCards" ? "selectCards" : "chooseTargets", instanceIds: [] })
            }
            onOpenBoard={() => setIsViewingBoard(true)}
          />
        ) : null}

        {isOrderTriggers ? (
          <DecisionTriggerChooser
            key={request.decisionId}
            triggerKeys={triggerKeys}
            triggerCardIds={triggerCardIds}
            triggerDetails={triggerDetails}
            wideDialog={wideDialog}
            timing={request.options?.timing}
            triggerTimings={request.options?.triggerTimings}
            triggerDescriptions={request.options?.triggerDescriptions}
            triggerReasons={request.options?.triggerReasons}
            triggerIsInherited={request.options?.triggerIsInherited}
            triggerIsOptional={request.options?.triggerIsOptional}
            waitingTriggers={waitingTriggersOf(request)}
            acceptsResolutionPlan={isResolutionPlan}
            onRespond={onRespond}
            onOpenBoard={() => setIsViewingBoard(true)}
          />
        ) : null}
        {isOrderCards ? (
          <DecisionOrderCardsFooter
            onConfirm={() => onRespond({ kind: "orderCards", order: cardOrder })}
            onOpenBoard={() => setIsViewingBoard(true)}
          />
        ) : null}
      </div>
    </>
  );
}

function waitingTriggersOf(request: DecisionRequest): WaitingTrigger[] {
  const cardIds = request.options?.waitingTriggerCardIds ?? [];
  return cardIds.map((cardId, index) => ({
    cardId,
    description: request.options?.waitingTriggerDescriptions?.[index],
    isInherited: request.options?.waitingTriggerIsInherited?.[index] === true,
  }));
}
