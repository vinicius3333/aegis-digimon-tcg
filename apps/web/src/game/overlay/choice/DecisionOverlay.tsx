import { useEffect, useRef, useState } from "react";
import type { DecisionRequest, DecisionResponse } from "@aegis/shared";
import { CardMini } from "../../../design/cards";
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
import { DecisionEffectChoice } from "./DecisionEffectChoice";
import { trapDialogFocus } from "./decisionFocusTrap";
import { DecisionOptionalFooter } from "./DecisionOptionalFooter";
import { DecisionOrderCardsFooter } from "./DecisionOrderCardsFooter";
import { DecisionOrderCardsPanel } from "./DecisionOrderCardsPanel";
import { totalPlayCost } from "./decisionPlayCost";
import { totalDP } from "./decisionDpBudget";
import { DecisionSelectFooter } from "./DecisionSelectFooter";
import { DecisionTriggerChooser } from "./DecisionTriggerChooser";
import type { DecisionCandidate } from "./decisionTypes";
import "../effectPromptFamily.css";

/** The art of the card asking the question, big enough to recognise beside its clause. */
const DECISION_SOURCE_ART_WIDTH = 64;

export function DecisionOverlay({
  request,
  sourceCardId,
  candidates,
  picks,
  triggerDetails = [],
  onTogglePick,
  onRespond,
}: {
  request: DecisionRequest;
  sourceCardId?: string;
  candidates: DecisionCandidate[];
  picks: string[];
  /** Aligned to `request.options.triggerKeys`; empty means the chooser shows names only. */
  triggerDetails?: readonly TriggerDetail[];
  onTogglePick: (instanceId: string) => void;
  onRespond: (response: DecisionResponse) => void;
}) {
  const { t } = useTranslation();
  const openCard = useCardOpener();
  const wideDialog = useMediaQuery(WIDE_DIALOG_QUERY);
  const min = decisionSelectionMin(request);
  const max = request.options?.max ?? 1;
  const choices = request.options?.choices ?? [];
  const choiceEffects = request.options?.choiceEffects;
  const isOptional = request.kind === "optional";
  const isChoose = request.kind === "chooseOption";
  const isSelect = request.kind === "chooseTargets" || request.kind === "selectCards";
  const isOrderCards = request.kind === "orderCards";
  const isOrderTriggers = request.kind === "orderTriggers";
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
  const [selectedTriggerKeys, setSelectedTriggerKeys] = useState<string[]>([]);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnControlRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setIsViewingBoard(false);
  }, [request.decisionId]);
  useEffect(() => {
    setSelectedTriggerKeys([]);
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

  const toggleTrigger = (key: string) => {
    setSelectedTriggerKeys((prev) => (prev[0] === key ? [] : [key]));
  };

  const confirmSelect = () => {
    if (request.kind === "selectCards") onRespond({ kind: "selectCards", instanceIds: picks });
    else onRespond({ kind: "chooseTargets", instanceIds: picks });
  };

  const sourceEffectText = sourceCardId
    ? playerFacingEffectClause({
        cardId: sourceCardId,
        timing: request.options?.timing,
        description: request.options?.effectText,
        effectTextPart: request.options?.effectTextPart,
        isInherited: request.options?.isInherited,
      })
    : undefined;
  /* The dialog is named by a plain string rather than by its visible title: that title
     now carries the source card as a link, and an aria-labelledby would read the link's
     own label ("Open …") in place of the card's name. */
  const dialogLabel = sourceCardId
    ? t("overlay.cardEffect", { name: printedCardName(sourceCardId) })
    : t("overlay.effect");

  const genericPrompt = t(
    isOptional ? "overlay.useEffectPrompt" : isChoose ? "overlay.chooseEffectPrompt" : "overlay.resolveEffect",
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

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
      className={`game-modal__panel game-modal__panel--bare decision-overlay effect-prompt-family${wideDialog ? " decision-overlay--wide" : ""}${isSelect ? " decision-overlay--selection" : ""}${isOrderTriggers ? " decision-overlay--trigger-chooser" : ""}`}
      onKeyDown={(event) => trapDialogFocus({ event, panelRef })}
      /* Geometry, surface and entrance all live in game.css: inline values could not be
         overridden by the phone bottom-sheet rules, and an inline `animation` shorthand
         hid both the shared `--t-dialog-in` timing and the reduced-motion override. */
      style={{ width: wideDialog && Math.max(candidates.length, triggerKeys.length) > 3 ? 1000 : 560 }}
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
            <h2 className="decision-overlay__title">{promptText}</h2>
          </div>
          {!isOrderTriggers && sourceEffectText ? (
            <p className="decision-overlay__effect-text">{sourceEffectText}</p>
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
      ) : isChoose ? (
        <DecisionChooseFooter choices={choices} onRespond={onRespond} onOpenBoard={() => setIsViewingBoard(true)} />
      ) : null}

      {isOptional ? <DecisionOptionalFooter onRespond={onRespond} onOpenBoard={() => setIsViewingBoard(true)} /> : null}

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
          triggerKeys={triggerKeys}
          triggerCardIds={triggerCardIds}
          triggerDetails={triggerDetails}
          selectedTriggerKeys={selectedTriggerKeys}
          wideDialog={wideDialog}
          timing={request.options?.timing}
          triggerTimings={request.options?.triggerTimings}
          triggerDescriptions={request.options?.triggerDescriptions}
          triggerIsInherited={request.options?.triggerIsInherited}
          onToggle={toggleTrigger}
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
  );
}
