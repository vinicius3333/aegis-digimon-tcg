/* The viewer's open decision, in whichever surface answers it.

   A selection the board itself can answer is asked on the board — a rail at the edge
   over a lit field — and everything else is asked in the dialog. The pill is the other
   half of the same idea: the opponent has a question open and the viewer is waiting. */

import {
  assemblyRequirementFor,
  digiXrosRequirementFor,
  type DecisionRequest,
  type DecisionResponse,
  type Permanent,
} from "@aegis/shared";
import { useTranslation } from "../../../i18n";
import {
  BoardOptionalPrompt,
  BoardSelectionRail,
  BoardSourceHostPrompt,
  OpponentSelectingPill,
} from "../../BoardDecisionRail";
import { decisionPermanentDetails, decisionSourceCounts, type CandidateZone } from "../../decisionModel";
import {
  AssemblyMaterialOverlay,
  DecisionOverlay,
  DigiXrosMaterialOverlay,
  playerFacingEffectClause,
  playerFacingPromptText,
} from "../../overlay";
import type { DigiXrosCandidate, TriggerDetail } from "../../overlay";

/**
 * A one-card pick from the digivolution cards of several of the viewer's Digimon: the board
 * picks the Digimon first (`picking`), then the dialog shows only the cards under it.
 */
export interface SourceHostStep {
  picking: boolean;
  /** The offered cards under the chosen Digimon; undefined while `picking`. */
  cardIds: ReadonlySet<string> | undefined;
  onChangeHost: () => void;
}

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
  sourceHost,
}: {
  /** The viewer's own decision, once the presentation has caught up with it. */
  decision: DecisionRequest | undefined;
  /** This decision is answered on the board rather than in the dialog. */
  answerOnBoard: boolean;
  /** Both battle areas, which is where the dialog reads its stack and DP badges. */
  permanents: readonly Permanent[];
  sourceCardId: string | undefined;
  candidates: readonly { instanceId: string; cardId?: string; artId?: string; zone?: CandidateZone }[];
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
  /** A one-card source pick that first asks which Digimon to look under. */
  sourceHost?: SourceHostStep;
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
  const boardSelectionKind =
    decision?.kind === "selectCards" || decision?.kind === "chooseTargets" ? decision.kind : undefined;
  const assemblyCardId = decision?.kind === "selectCards" ? decision.options?.assemblyCardId : undefined;
  const assemblyRequirements = assemblyCardId ? assemblyRequirementFor(assemblyCardId) : undefined;
  const isAssemblyDecision = assemblyCardId !== undefined && (assemblyRequirements?.length ?? 0) > 0;
  const digiXrosCardId = decision?.kind === "selectCards" ? decision.options?.digiXrosCardId : undefined;
  const digiXrosRequirements = digiXrosCardId ? digiXrosRequirementFor(digiXrosCardId) : undefined;
  const isDigiXrosDecision = digiXrosCardId !== undefined && digiXrosRequirements !== undefined;
  const isMaterialDecision = isAssemblyDecision || isDigiXrosDecision;
  return (
    <>
      {decision && !answerOnBoard && sourceHost?.picking ? (
        <BoardSourceHostPrompt
          sourceCardId={sourceCardId}
          clause={clause}
          onNoSelection={
            min === 0 && boardSelectionKind ? () => onRespond({ kind: boardSelectionKind, instanceIds: [] }) : undefined
          }
        />
      ) : null}

      {decision && decision.kind !== "mulligan" && !answerOnBoard && !isMaterialDecision && !sourceHost?.picking
        ? (() => {
            const sourceCounts = decisionSourceCounts(permanents);
            const permanentDetails = decisionPermanentDetails(permanents);
            return (
              <DecisionOverlay
                key={decision.decisionId}
                request={decision}
                sourceCardId={sourceCardId}
                candidates={candidates
                  .filter((card) => sourceHost?.cardIds === undefined || sourceHost.cardIds.has(card.instanceId))
                  .map((card) => {
                    const details = permanentDetails.get(card.instanceId);
                    return {
                      instanceId: card.instanceId,
                      cardId: card.cardId,
                      artId: card.artId,
                      selectable: allowsPick(card.instanceId),
                      sourceCount: sourceCounts.get(card.instanceId),
                      currentDP: details?.currentDP,
                      isSuspended: details?.isSuspended,
                      zone: card.zone,
                    };
                  })}
                picks={picks}
                triggerDetails={triggerDetails}
                onTogglePick={onTogglePick}
                onRespond={onRespond}
                {...(sourceHost?.cardIds ? { onChangeSourceHost: sourceHost.onChangeHost } : {})}
              />
            );
          })()
        : null}

      {decision && answerOnBoard && boardSelectionKind && !isMaterialDecision ? (
        <BoardSelectionRail
          attackSelection={decision.options?.selectionContext === "attackTarget"}
          fieldSelection={candidates.some(
            (candidate) => candidate.zone === "battle" || candidate.zone === "opponentBattle",
          )}
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
          onConfirm={() => onRespond({ kind: boardSelectionKind, instanceIds: picks })}
          onNoSelection={() => onRespond({ kind: boardSelectionKind, instanceIds: [] })}
          onOpenDialog={onOpenDialog}
        />
      ) : null}

      {decision?.kind === "selectCards" && assemblyCardId && assemblyRequirements && isAssemblyDecision ? (
        <AssemblyMaterialOverlay
          playingCardId={assemblyCardId}
          requirements={assemblyRequirements}
          candidates={candidates.flatMap((candidate) =>
            candidate.cardId
              ? [{ instanceId: candidate.instanceId, cardId: candidate.cardId, artId: candidate.artId }]
              : [],
          )}
          onConfirm={(instanceIds) => onRespond({ kind: "selectCards", instanceIds })}
          onSkip={() => onRespond({ kind: "selectCards", instanceIds: [] })}
        />
      ) : null}

      {decision?.kind === "selectCards" && digiXrosCardId && digiXrosRequirements ? (
        <DigiXrosMaterialOverlay
          playingCardId={digiXrosCardId}
          requirements={digiXrosRequirements}
          candidates={candidates.flatMap<DigiXrosCandidate>((candidate) => {
            if (!candidate.cardId || (candidate.zone !== "hand" && candidate.zone !== "battle")) return [];
            const permanent = permanents.find((entry) => entry.topCard?.instanceId === candidate.instanceId);
            return [
              {
                instanceId: candidate.instanceId,
                cardId: candidate.cardId,
                artId: candidate.artId,
                zone: candidate.zone,
                ...(permanent
                  ? {
                      digiXrosNames: [...permanent.digiXrosNames],
                      canSubstitute: permanent.keywords.includes("DigiXrosSubstitute"),
                    }
                  : {}),
              },
            ];
          })}
          lockedCandidates={candidates.flatMap<DigiXrosCandidate>((candidate) => {
            if (!candidate.cardId) return [];
            if (candidate.zone === "trash")
              return [
                { instanceId: candidate.instanceId, cardId: candidate.cardId, artId: candidate.artId, zone: "trash" },
              ];
            if (candidate.zone === "digivolutionCards")
              return [
                {
                  instanceId: candidate.instanceId,
                  cardId: candidate.cardId,
                  artId: candidate.artId,
                  zone: "underTamer",
                },
              ];
            return [];
          })}
          eligibleExpanders={[]}
          intrinsicTrashMax={candidates.filter((candidate) => candidate.zone === "trash").length}
          intrinsicUnderTamerMax={candidates.filter((candidate) => candidate.zone === "digivolutionCards").length}
          onConfirm={(instanceIds) => onRespond({ kind: "selectCards", instanceIds })}
          onSkip={() => onRespond({ kind: "selectCards", instanceIds: [] })}
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
