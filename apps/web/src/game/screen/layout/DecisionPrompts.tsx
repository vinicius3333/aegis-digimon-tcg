/* The viewer's open decision, in whichever surface answers it.

   A selection the board itself can answer is asked on the board — a rail at the edge
   over a lit field — and everything else is asked in the dialog. The pill is the other
   half of the same idea: the opponent has a question open and the viewer is waiting. */

import type { DecisionRequest, DecisionResponse, Permanent } from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import { BoardOptionalPrompt, BoardSelectionRail, OpponentSelectingPill } from "../../BoardDecisionRail";
import { decisionPermanentDetails, decisionSourceCounts } from "../../boardModel";
import { DecisionOverlay, playerFacingEffectClause, playerFacingPromptText } from "../../overlay";
import type { TriggerDetail } from "../../overlay";

export function DecisionPrompts({
  decision,
  answerOnBoard,
  permanents,
  sourceCardId,
  candidates,
  allowsPick,
  picks,
  min,
  max,
  triggerDetails,
  opponentSelecting,
  onTogglePick,
  onRespond,
  onOpenDialog,
}: {
  /** The viewer's own decision, once the presentation has caught up with it. */
  decision: DecisionRequest | undefined;
  /** This decision is answered on the board rather than in the dialog. */
  answerOnBoard: boolean;
  /** Both battle areas, which is where the dialog reads its stack and DP badges. */
  permanents: readonly Permanent[];
  sourceCardId: string | undefined;
  candidates: readonly { instanceId: string; cardId?: string; artId?: string }[];
  allowsPick: (instanceId: string) => boolean;
  picks: string[];
  min: number;
  max: number;
  triggerDetails: readonly TriggerDetail[];
  /** The opponent has a question open and the viewer is waiting on their answer. */
  opponentSelecting: boolean;
  onTogglePick: (instanceId: string) => void;
  onRespond: (response: DecisionResponse) => void;
  onOpenDialog: () => void;
}) {
  const { t } = useTranslation();
  const clause = sourceCardId
    ? playerFacingEffectClause({
        cardId: sourceCardId,
        timing: decision?.options?.timing,
        description: decision?.options?.effectText,
        effectTextPart: decision?.options?.effectTextPart,
        isInherited: decision?.options?.isInherited,
      })
    : undefined;
  return (
    <>
      {decision && decision.kind !== "mulligan" && !answerOnBoard
        ? (() => {
            const sourceCounts = decisionSourceCounts(permanents);
            const permanentDetails = decisionPermanentDetails(permanents);
            return (
              <DecisionOverlay
                key={decision.decisionId}
                request={decision}
                sourceCardId={sourceCardId}
                candidates={candidates.map((card) => {
                  const details = permanentDetails.get(card.instanceId);
                  return {
                    instanceId: card.instanceId,
                    cardId: card.cardId,
                    artId: card.artId,
                    selectable: allowsPick(card.instanceId),
                    sourceCount: sourceCounts.get(card.instanceId),
                    currentDP: details?.currentDP,
                    isSuspended: details?.isSuspended,
                  };
                })}
                picks={picks}
                triggerDetails={triggerDetails}
                onTogglePick={onTogglePick}
                onRespond={onRespond}
              />
            );
          })()
        : null}

      {decision && answerOnBoard && decision.kind === "selectCards" ? (
        <BoardSelectionRail
          key={decision.decisionId}
          sourceCardId={sourceCardId}
          prompt={
            playerFacingPromptText(decision.promptText, decision.kind) ??
            (min === max
              ? t("overlay.selectCardsSubtitle", { count: max })
              : t("overlay.selectCardsRangeSubtitle", { range: `${min}–${max}` }))
          }
          clause={clause}
          min={min}
          max={max}
          pickCount={picks.length}
          canConfirm={picks.length >= min && picks.length <= max}
          onConfirm={() => onRespond({ kind: "selectCards", instanceIds: picks })}
          onNoSelection={() => onRespond({ kind: "selectCards", instanceIds: [] })}
          onOpenDialog={onOpenDialog}
        />
      ) : null}

      {decision && answerOnBoard && decision.kind === "optional" ? (
        <BoardOptionalPrompt
          key={decision.decisionId}
          sourceCardId={sourceCardId}
          prompt={playerFacingPromptText(decision.promptText, decision.kind)}
          clause={clause}
          onUse={() => onRespond({ kind: "optional", accept: true })}
          onDecline={() => onRespond({ kind: "optional", accept: false })}
          onOpenDialog={onOpenDialog}
        />
      ) : null}

      {/* Held back while a played card is still showcased centre-screen, so the
          effect notice (queued behind that showcase) is readable before the wait
          it explains is announced. */}
      {opponentSelecting ? <OpponentSelectingPill /> : null}
    </>
  );
}
