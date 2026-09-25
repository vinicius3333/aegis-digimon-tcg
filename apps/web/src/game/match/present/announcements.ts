import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { GameState, Seat, ServerEvent } from "@aegis/shared";
import { Side } from "../../side";
import {
  attackAnnouncementFromEvent,
  sidePanelFromEvent,
  type AttackAnnouncement,
  type SidePanel,
  type SidePanelLookup,
} from "../../sidePanels";
import {
  deletionNoticesFromEvent,
  effectNoticeFromEvent,
  keywordNoticeFromEvent,
  preventionNoticeFromEvent,
  recoveryNoticeFromEvent,
  securityGainNoticeFromEvent,
  stackStripNoticeFromEvent,
  type MatchNotice,
} from "../../notices";
import { CARD_BURST_PEAK_MS, TIMINGS } from "../../timings";
import type { DrawFlightCard, RevealOnStage } from "../types";

/** What one pass over a live batch's events says the screen has to announce. */
export type BatchAnnouncements = {
  announcement: AttackAnnouncement | null;
  opened: SidePanel[];
  raised: MatchNotice[];
  /**
   * Which event each panel and each notice came from. The server delivers a whole
   * `[Security]` resolution in ONE batch — the reveal, the free play it grants and the
   * [On Play] reveals that follow are all `fresh` together — so "before the card was played"
   * and "after it was played" is a position in these arrays, not a batch boundary.
   */
  panelAt: number[];
  noticeAt: number[];
};

/**
 * One pass over the batch: the panels it opens, the notices it raises, the attack it
 * announces — and, along the way, the draw ribbons its card movements owe.
 *
 * The pass is single because the notices carry ordering the events themselves define: a
 * `securityChecked` hands the next notice to the card it revealed, and the first notice of
 * the `effect` variant takes that claim back.
 */
export function collectBatchAnnouncements({
  fresh,
  viewerSeat,
  state,
  now,
  showcasePlays,
  attackLeadInMs,
  securityReveal,
  revealOnStageRef,
  pendingDigivolutionDrawRef,
  eventDrawCountsRef,
  drawPhaseWaitingRef,
  sidePanelLookupRef,
  sidePanelSequenceRef,
  noticeSequenceRef,
  securityEffectPendingRef,
  launchDrawFlight,
  launchDeckToUnderFlight,
  setHeldDrawState,
}: {
  fresh: readonly ServerEvent[];
  viewerSeat: Seat;
  state: GameState | undefined;
  /** One clock for the whole batch, so everything it raises shares a start time. */
  now: number;
  /** The beat an attack call-out owns before anything the attack caused may be drawn. */
  attackLeadInMs: number;
  /**
   * Whether the centre-stage showcase will run. It runs only in `live` mode, so under reduced
   * motion or a hidden tab the panel is the only thing left to announce an arrival, and
   * `sidePanelFromEvent` is told to keep it.
   */
  showcasePlays: boolean;
  securityReveal: ServerEvent | undefined;
  revealOnStageRef: MutableRefObject<RevealOnStage | null>;
  /** Mutated: the seats owed a digivolution draw, so its ribbon waits for the card burst. */
  pendingDigivolutionDrawRef: MutableRefObject<Set<Seat>>;
  /** Mutated: the hand count each side had when this batch's draw was announced. */
  eventDrawCountsRef: MutableRefObject<{ you?: number; opp?: number }>;
  /** Mutated: the seat whose draw-phase hold an effect draw releases. */
  drawPhaseWaitingRef: MutableRefObject<Seat | null>;
  sidePanelLookupRef: MutableRefObject<SidePanelLookup>;
  /** Mutated: incremented per event so every panel and announcement gets its own id. */
  sidePanelSequenceRef: MutableRefObject<number>;
  /** Mutated: incremented per notice id handed out. */
  noticeSequenceRef: MutableRefObject<number>;
  /** Mutated: true while a revealed security card owns the next notice. */
  securityEffectPendingRef: MutableRefObject<boolean>;
  launchDrawFlight: (side: Side, burst: boolean, delayMs: number, card?: DrawFlightCard) => void;
  launchDeckToUnderFlight: (seat: Seat, permanentId: string) => void;
  setHeldDrawState: Dispatch<SetStateAction<{ seat: Seat; state: GameState } | undefined>>;
}): BatchAnnouncements {
  let announcement: AttackAnnouncement | null = null;
  const opened: SidePanel[] = [];
  const raised: MatchNotice[] = [];
  const panelAt: number[] = [];
  const noticeAt: number[] = [];
  /* The card a check is currently holding on screen. A `[Security]` clause that plays its
     own card raises the ordinary "played card" panel, which under reduced motion or a hidden
     tab is the only announcement a play gets — but here it is not: the dock is holding that
     exact card up, so the panel would name it twice, in the column the [On Play] result
     needs. */
  const dockedCardId =
    securityReveal?.kind === "securityRevealed"
      ? securityReveal.revealedCardId
      : revealOnStageRef.current?.scene.revealed.cardId;
  for (const [eventIndex, event] of fresh.entries()) {
    if (event.kind === "digivolved") pendingDigivolutionDrawRef.current.add(event.seat);
    // A card whose identity the move made public (one taken from a reveal) flies face-up;
    // a plain draw names no card, so it keeps flying as a card back.
    if (event.kind === "cardsMoved" && event.to === "hand" && (event.from === "deck" || event.cardIds !== undefined)) {
      const seat =
        event.seat ??
        event.instanceIds.map((id) => sidePanelLookupRef.current.seat(id)).find((owner) => owner !== undefined);
      if (seat !== undefined) {
        const side = seat === viewerSeat ? Side.Viewer : Side.Opponent;
        eventDrawCountsRef.current[side] = state?.players[seat]?.handCount;
        const followsDigivolution = event.drawReason === "digivolution" && pendingDigivolutionDrawRef.current.has(seat);
        const waitBeforeMs = followsDigivolution ? CARD_BURST_PEAK_MS : attackLeadInMs;
        // One flight per card. The server names a whole Draw 2 in a single event, so a
        // flight per event sent one card back for two cards and read as a single draw.
        for (const [drawIndex] of event.instanceIds.entries()) {
          const cardId = event.cardIds?.[drawIndex];
          const artId = event.artIds?.[drawIndex];
          launchDrawFlight(
            side,
            false,
            waitBeforeMs + drawIndex * TIMINGS.drawFlightStagger,
            cardId ? { cardId, ...(artId ? { artId } : {}) } : undefined,
          );
        }
        /**
         * An effect draw by the held seat releases that seat's draw-phase hold.
         *
         * The hold freezes the presented hand at the previous revision so the draw the turn
         * opens with stays hidden until its Draw banner. Only the phase draw needs hiding,
         * and that one moves through GameEngine.drawCards and emits no event at all:
         * reaching this line means the cards came from an effect, and belong on screen now.
         *
         * The seat matters. A turn that flips in the same patch that carried the PREVIOUS
         * player's last effect arms the hold for the incoming seat before this batch is
         * read; releasing it here on the outgoing seat's draw let the incoming seat's
         * turn-start draw fly ribbons ahead of its own Draw banner.
         */
        if (drawPhaseWaitingRef.current === seat) {
          drawPhaseWaitingRef.current = null;
          setHeldDrawState(undefined);
        }
        if (event.drawReason === "digivolution") pendingDigivolutionDrawRef.current.delete(seat);
      }
    }
    if (event.kind === "cardsMoved" && event.deckToUnder) {
      const { seat, permanentId, count } = event.deckToUnder;
      for (let index = 0; index < count; index += 1) launchDeckToUnderFlight(seat, permanentId);
    }
    sidePanelSequenceRef.current += 1;
    const id = `side-panel-${sidePanelSequenceRef.current}`;
    const announced = sidePanelFromEvent(event, viewerSeat, sidePanelLookupRef.current, id, now, showcasePlays);
    const panel =
      announced?.titleKey === "panel.playedCard" && announced.cards[0]?.cardId === dockedCardId ? null : announced;
    if (panel) {
      opened.push(panel);
      panelAt.push(eventIndex);
    }
    announcement = attackAnnouncementFromEvent(event, viewerSeat, id, now) ?? announcement;
    // A security card that resolves an effect owns the next notice, which is why the flag is
    // read here rather than derived from the event alone.
    if (event.kind === "securityChecked") securityEffectPendingRef.current = event.resolution === "effect";
    const candidateNotices =
      event.kind === "cardsMoved" && (event.deletedPermanents?.length ?? 0) > 0
        ? deletionNoticesFromEvent(
            event,
            viewerSeat,
            () => {
              noticeSequenceRef.current += 1;
              return `notice-${noticeSequenceRef.current}`;
            },
            now,
          )
        : (() => {
            noticeSequenceRef.current += 1;
            const noticeId = `notice-${noticeSequenceRef.current}`;
            return [
              effectNoticeFromEvent(
                event,
                viewerSeat,
                noticeId,
                now,
                securityEffectPendingRef.current,
                sidePanelLookupRef.current.artId,
              ) ??
                stackStripNoticeFromEvent(event, viewerSeat, noticeId, now) ??
                recoveryNoticeFromEvent(event, viewerSeat, noticeId, now) ??
                securityGainNoticeFromEvent(event, viewerSeat, noticeId, now) ??
                preventionNoticeFromEvent(event, viewerSeat, noticeId, now) ??
                keywordNoticeFromEvent(event, viewerSeat, noticeId, now),
            ];
          })();
    for (const notice of candidateNotices)
      if (notice) {
        if (notice.body.variant === "effect") securityEffectPendingRef.current = false;
        raised.push(notice);
        noticeAt.push(eventIndex);
      }
  }
  return { announcement, opened, raised, panelAt, noticeAt };
}
