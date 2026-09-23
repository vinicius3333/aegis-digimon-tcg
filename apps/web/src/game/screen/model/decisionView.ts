import type { DecisionRequest, GameState, Permanent, Seat, SequencedServerEvent } from "@aegis/shared";
import { buildInstanceArtIndex } from "../../sidePanels";
import { buildInstanceZoneIndex, decisionCardColors, decisionVisibleCards } from "../../decisionModel";
import { decisionEffectSource } from "../../matchLog";
import { decisionPresentation, decisionSelectionMin, sourcePermanentIdOf } from "../../decisionPresentation";

/** The open decision as the board shows it, and where the viewer answers it. */
export type DecisionView = {
  /** The prompt, once the beats that explain it have finished; undefined until then. */
  viewerDecision: DecisionRequest | undefined;
  /** True when the answer is given by tapping the board rather than in a dialog. */
  answerOnBoard: boolean;
  /** The permanent the prompt came from, highlighted only while it is answered on the board. */
  decisionHighlightPermanentId: string | undefined;
  /** The card whose clause is being asked about, named on the board prompt. */
  decisionSourceCardId: string | undefined;
  decisionSelectable: Set<string>;
  decisionVisible: ReturnType<typeof decisionVisibleCards>;
  decisionVisibleCardIds: Map<string, string | undefined>;
  decisionInstanceColors: ReturnType<typeof decisionCardColors>;
  decisionDifferentColors: boolean;
  decisionDistinctCardIds: boolean;
  decisionDistinctNames: boolean;
  /** The summed-DP cap the engine enforces on this selection, if any. */
  decisionMaxTotalDP: number | undefined;
  /** Current DP of each board candidate, keyed by permanent and top-card id. */
  decisionCandidateDP: Map<string, number>;
  decisionMin: number;
  decisionMax: number;
};

/**
 * Everything the screen needs to render the open decision.
 *
 * All of it reads the server's decision payload; the client adds no legality of its own, it
 * only decides which surface the payload renders on. The prompt itself is revealed only after
 * the finite visual beats that explain it have finished — the security dock and the toast
 * reading do not participate in that gate.
 */
export function decisionViewFor({
  decision,
  decisionAnimationsPending,
  decisionAsDialog,
  viewerSeat,
  events,
  state,
  instanceIndex,
  permanents,
  handInstanceIds,
}: {
  decision: DecisionRequest | undefined;
  decisionAnimationsPending: boolean;
  /** The viewer moved a board-answered prompt into its dialog. */
  decisionAsDialog: boolean;
  viewerSeat: Seat;
  events: SequencedServerEvent[];
  state: GameState;
  instanceIndex: ReadonlyMap<string, string>;
  permanents: readonly Permanent[];
  handInstanceIds: readonly string[];
}): DecisionView {
  const viewerDecision = decision && decision.seat === viewerSeat && !decisionAnimationsPending ? decision : undefined;
  const decisionSourceCardId = viewerDecision ? decisionEffectSource(viewerDecision, events) : undefined;
  const decisionSourcePermanentId =
    viewerDecision?.kind === "optional"
      ? sourcePermanentIdOf(decisionSourceCardId, permanents, viewerDecision)
      : undefined;
  const boardPresentation = viewerDecision
    ? decisionPresentation({
        decision: viewerDecision,
        handInstanceIds,
        sourcePermanentId: decisionSourcePermanentId,
        fieldInstanceIds: permanents.flatMap((permanent) => [permanent.permanentId, permanent.topCard.instanceId]),
      })
    : "dialog";
  const answerOnBoard = boardPresentation === "board" && !decisionAsDialog;
  const decisionVisible = viewerDecision
    ? decisionVisibleCards(
        viewerDecision.options,
        instanceIndex,
        buildInstanceArtIndex(state),
        buildInstanceZoneIndex(state, viewerSeat),
      )
    : [];
  return {
    viewerDecision,
    answerOnBoard,
    decisionSourceCardId,
    decisionHighlightPermanentId: answerOnBoard ? decisionSourcePermanentId : undefined,
    decisionSelectable: new Set(viewerDecision?.options?.candidateInstanceIds ?? []),
    decisionVisible,
    decisionVisibleCardIds: new Map(decisionVisible.map((card) => [card.instanceId, card.cardId])),
    decisionInstanceColors: decisionCardColors(decisionVisible),
    decisionDifferentColors: viewerDecision?.options?.differentColors === true,
    decisionDistinctCardIds: viewerDecision?.options?.distinctCardIds === true,
    decisionDistinctNames: viewerDecision?.options?.distinctNames === true,
    decisionMaxTotalDP: viewerDecision?.options?.maxTotalDP,
    decisionCandidateDP: new Map(
      permanents.flatMap((permanent) => [
        [permanent.permanentId, permanent.currentDP] as const,
        [permanent.topCard.instanceId, permanent.currentDP] as const,
      ]),
    ),
    decisionMin: decisionSelectionMin(viewerDecision),
    decisionMax: viewerDecision?.options?.max ?? 1,
  };
}
