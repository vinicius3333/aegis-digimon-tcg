import { useEffect, type MutableRefObject } from "react";
import type { GameState, PlayerState, Seat } from "@aegis/shared";
import { snapshotGameState } from "../../../net/presentedState";
import type { PhaseBanner } from "../../phaseBanner";
import { Side } from "../../side";

/**
 * A hand that grew was drawn into.
 *
 * The opening hand and a mulligan redeal are not draws, so the first observed pair is only a
 * baseline. A draw an event already narrated is not flown twice, which is what the event
 * counts rule out.
 *
 * The held side keeps every figure it had — its count, the flag that says the growth is a
 * turn-start draw, and the event count that proves the draw was already narrated. They are
 * read again on the pass the Draw ribbon releases.
 */
export function useDrawWatcher({
  state,
  viewer,
  opponent,
  viewerSeat,
  mulliganOpen,
  phaseBanner,
  drawPhaseWaitingRef,
  previousDrawStateRef,
  handCountsRef,
  turnStartDrawRef,
  eventDrawCountsRef,
  launchDrawFlight,
}: {
  state: GameState | undefined;
  viewer: PlayerState | undefined;
  opponent: PlayerState | undefined;
  viewerSeat: Seat;
  mulliganOpen: boolean;
  phaseBanner: PhaseBanner | null;
  drawPhaseWaitingRef: MutableRefObject<Seat | null>;
  /** Mutated: the board the held seat's hand is still presented at. */
  previousDrawStateRef: MutableRefObject<GameState | undefined>;
  /** Mutated: the hand counts this pass compares against. */
  handCountsRef: MutableRefObject<{ you: number; opp: number } | null>;
  /** Mutated: which side's next growth is its turn-start draw. */
  turnStartDrawRef: MutableRefObject<{ you: boolean; opp: boolean }>;
  /** Mutated: the hand count an event-driven draw already accounted for. */
  eventDrawCountsRef: MutableRefObject<{ you?: number; opp?: number }>;
  launchDrawFlight: (side: Side, turnStart?: boolean) => void;
}) {
  useEffect(() => {
    if (drawPhaseWaitingRef.current === null) {
      previousDrawStateRef.current = state ? snapshotGameState(state) : undefined;
    }
  }, [state, state?.stateVersion, viewer?.handCount, opponent?.handCount, phaseBanner]);
  useEffect(() => {
    if (viewer === undefined || opponent === undefined) return;
    const heldSeat = drawPhaseWaitingRef.current;
    const heldSide: Side | undefined =
      heldSeat === null ? undefined : heldSeat === viewerSeat ? Side.Viewer : Side.Opponent;
    const previous = handCountsRef.current;
    handCountsRef.current = {
      you: heldSide === Side.Viewer && previous ? previous.you : viewer.handCount,
      opp: heldSide === Side.Opponent && previous ? previous.opp : opponent.handCount,
    };
    if (!previous || mulliganOpen) {
      turnStartDrawRef.current = { you: false, opp: false };
      return;
    }
    const turnStart = turnStartDrawRef.current;
    turnStartDrawRef.current = {
      you: heldSide === Side.Viewer && turnStart.you,
      opp: heldSide === Side.Opponent && turnStart.opp,
    };
    if (
      heldSide !== Side.Opponent &&
      opponent.handCount > previous.opp &&
      eventDrawCountsRef.current.opp !== opponent.handCount
    )
      launchDrawFlight(Side.Opponent, turnStart.opp);
    if (
      heldSide !== Side.Viewer &&
      viewer.handCount > previous.you &&
      eventDrawCountsRef.current.you !== viewer.handCount
    )
      launchDrawFlight(Side.Viewer, turnStart.you);
    eventDrawCountsRef.current = heldSide ? { [heldSide]: eventDrawCountsRef.current[heldSide] } : {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer?.handCount, opponent?.handCount, phaseBanner]);
}
