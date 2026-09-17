import { useEffect, type MutableRefObject } from "react";
import type { PlayerState, Seat } from "@aegis/shared";
import { otherSeat } from "../../boardModel";
import { securityGainNotice, type MatchNotice } from "../../notices";
import type { SidePanel } from "../../sidePanels";
import { Side } from "../../side";
import { OpeningDealState } from "../enums";

/**
 * A security stack that grew with no event to explain it.
 *
 * Every growth an event named has already claimed its seat, so this watcher only picks up
 * what is left — and the opening deal, which is not a gain at all: nothing was recovered or
 * stacked, the match simply started, and it is dealt to both seats out of the same empty
 * board.
 */
export function useSecurityCountWatcher({
  viewer,
  opponent,
  viewerSeat,
  mulliganOpen,
  securityCountsRef,
  openingSecurityDealRef,
  securityGrowthClaimedRef,
  noticeSequenceRef,
  lastBatchIdRef,
  launchOpeningSecurityDeal,
  launchSecurityGainFlight,
  narrate,
}: {
  viewer: PlayerState | undefined;
  opponent: PlayerState | undefined;
  viewerSeat: Seat;
  mulliganOpen: boolean;
  /** Mutated: the counts this pass compares against. */
  securityCountsRef: MutableRefObject<{ you: number; opp: number } | null>;
  /** Mutated: flipped to done by the first pass that could have seen the opening deal. */
  openingSecurityDealRef: MutableRefObject<OpeningDealState>;
  /** Mutated: a seat whose growth a batch already played is consumed here, not flown again. */
  securityGrowthClaimedRef: MutableRefObject<Set<Seat>>;
  noticeSequenceRef: MutableRefObject<number>;
  lastBatchIdRef: MutableRefObject<string>;
  launchOpeningSecurityDeal: (seat: Seat, count: number) => void;
  launchSecurityGainFlight: (seat: Seat) => void;
  narrate: (notices: readonly MatchNotice[], panels: readonly SidePanel[], batchId: string) => void;
}) {
  useEffect(() => {
    if (viewer === undefined || opponent === undefined) return;
    const previous = securityCountsRef.current;
    securityCountsRef.current = { you: viewer.securityCount, opp: opponent.securityCount };
    if (!previous || mulliganOpen) return;
    if (openingSecurityDealRef.current === OpeningDealState.Pending) {
      const opening = previous.you === 0 && previous.opp === 0;
      openingSecurityDealRef.current = OpeningDealState.Done;
      if (opening) {
        if (viewer.securityCount > 0) launchOpeningSecurityDeal(viewerSeat, viewer.securityCount);
        if (opponent.securityCount > 0) launchOpeningSecurityDeal(otherSeat(viewerSeat), opponent.securityCount);
        securityGrowthClaimedRef.current.clear();
        return;
      }
    }
    const gains = [
      { seat: viewerSeat, side: Side.Viewer, amount: viewer.securityCount - previous.you },
      { seat: otherSeat(viewerSeat), side: Side.Opponent, amount: opponent.securityCount - previous.opp },
    ];
    for (const { seat, side, amount } of gains) {
      if (amount <= 0) continue;
      if (securityGrowthClaimedRef.current.delete(seat)) continue;
      launchSecurityGainFlight(seat);
      noticeSequenceRef.current += 1;
      narrate(
        [securityGainNotice(side, amount, `notice-${noticeSequenceRef.current}`, Date.now())],
        [],
        lastBatchIdRef.current,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer?.securityCount, opponent?.securityCount]);
}
