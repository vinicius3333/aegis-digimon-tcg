import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import type { MatchNotice } from "../../notices";
import type { SidePanel } from "../../sidePanels";
import {
  permanentBurstFromEvent,
  zoneShowcaseFromEvent,
  type PermanentBurst,
  type ZoneShowcase,
} from "../../showcases";
import { CueTrack } from "../enums";
import { zoneChangeStep } from "../steps/zoneChangeStep";
import type { RevealOnStage } from "../types";

/** What the batch's arrivals leave for the narration routing below them to decide. */
export type BatchArrivals = {
  /** True once any event in the batch puts a card on the field. */
  arriving: boolean;
  /** True once one of those arrivals earns the centre-stage showcase. */
  showcased: boolean;
  /** The arrival steps a security reveal holds back, to be enqueued once it has staged. */
  zoneChanges: AnimationStep[];
  /** The first event that puts a card on the field, which is what a check's play is. */
  firstArrivalIndex: number;
  /** The notices that wait for the showcase to be over, the call-out having taken its beat. */
  afterShowcaseNotices: MatchNotice[];
};

/**
 * Zone changes own the centre of the screen: the opponent's card is held up, the destination
 * stays hidden behind it, and only then does the permanent reveal on its burst. The viewer's
 * own moves keep the burst and skip the hold — they watched the card leave their own hand.
 *
 * A batch that also opens a security check is the exception. The check takes the centre of
 * the screen with `replace`, so a zone change enqueued ahead of it is cancelled before it
 * draws a frame — which is why a card played BY a [Security] effect used to appear on the
 * field with no arrival at all. Those steps are collected instead and enqueued after the
 * reveal has been staged, so the card is seen arriving once the reveal has finished with the
 * screen.
 */
export function enqueueArrivals({
  fresh,
  viewerSeat,
  batchId,
  raised,
  combatLeadInMs,
  securityReveal,
  securityBlowRef,
  queue,
  showcaseKeyRef,
  presentationBatchRef,
  enqueuePhaseOrderRef,
  revealOnStageRef,
  setPendingPermanentIds,
  setZoneShowcase,
  setPermanentBursts,
  arrivalHoldIds,
  releaseArrivalHoldsWhenIdle,
  narrate,
  enqueue,
}: {
  fresh: readonly ServerEvent[];
  viewerSeat: Seat;
  batchId: string;
  raised: readonly MatchNotice[];
  combatLeadInMs: number;
  securityReveal: ServerEvent | undefined;
  /** The check whose battle has not been drawn yet, which owns the centre of the screen. */
  securityBlowRef: MutableRefObject<{ key: number; landed: boolean } | null>;
  queue: AnimationQueue;
  /** Mutated: incremented per event so each arrival gets its own key. */
  showcaseKeyRef: MutableRefObject<number>;
  presentationBatchRef: MutableRefObject<{ batchId: string; stateVersion: number } | undefined>;
  enqueuePhaseOrderRef: MutableRefObject<number | undefined>;
  revealOnStageRef: MutableRefObject<RevealOnStage | null>;
  setPendingPermanentIds: Dispatch<SetStateAction<ReadonlySet<string>>>;
  setZoneShowcase: Dispatch<SetStateAction<ZoneShowcase | null>>;
  setPermanentBursts: Dispatch<SetStateAction<ReadonlyMap<string, PermanentBurst>>>;
  /** Mutated: every permanent this batch keeps off the board until its cue has run. */
  arrivalHoldIds: string[];
  releaseArrivalHoldsWhenIdle: () => void;
  narrate: (notices: readonly MatchNotice[], panels: readonly SidePanel[], batchId: string) => void;
  enqueue: (step: AnimationStep) => void;
}): BatchArrivals {
  let arriving = false;
  let showcased = false;
  const zoneChanges: AnimationStep[] = [];
  let firstArrivalIndex = fresh.length;
  /* A named-mechanic call-out belongs WITH the card it names. "DigiXros!" printed after the
     showcase reads as a caption for whatever came next — which, when the Xrosed card has an
     [On Play] that deletes, is the board emptying. So it is raised as the card goes
     centre-stage and shares that beat, and everything else the batch raised waits until the
     showcase is over. A security check owns its own ordering and is left alone. */
  const calloutNotices = securityReveal ? [] : raised.filter((notice) => notice.body.variant === "keyword");
  const afterShowcaseNotices = raised.filter((notice) => !calloutNotices.includes(notice));
  let calloutEnqueued = false;
  for (const [eventIndex, event] of fresh.entries()) {
    showcaseKeyRef.current += 1;
    const key = showcaseKeyRef.current;
    const showcase = zoneShowcaseFromEvent(event, viewerSeat, key);
    const burst = permanentBurstFromEvent(event, key);
    if (!showcase && !burst) continue;
    arriving = true;
    showcased ||= showcase !== null;
    if (showcase || burst) firstArrivalIndex = Math.min(firstArrivalIndex, eventIndex);
    // The call-out and the showcase behind it are one beat on one serial track, so the
    // battle's lead-in is waited out once, by whichever of the two goes first.
    let leadInMs = combatLeadInMs;
    if (showcase && !calloutEnqueued && calloutNotices.length > 0) {
      calloutEnqueued = true;
      leadInMs = 0;
      const callout = calloutNotices;
      enqueue({
        id: `showcase-callout-${key}`,
        track: CueTrack.CenterStage,
        skippable: false,
        async run(context) {
          await context.wait(combatLeadInMs);
          if (context.cancelled) return;
          narrate(callout, [], batchId);
        },
      });
    }
    /**
     * The centre of the screen belongs to the check until its battle has been drawn.
     * A card a removal reaction plays mid-check wants the same spot for its showcase,
     * and being serial the centre-stage track simply hands it over: the 1.8s showcase
     * ran between the clash and its outcome, so the battle broke in half and the verdict
     * arrived a scene later. The card still lands, on its burst — it just does not take
     * the stage the check is still using.
     */
    // The revealed card playing ITSELF is the check's own scene, not an interruption of
    // it: that showcase is the whole point of a [Security] play and stays.
    const playsItself = event.kind === "cardPlayed" && event.cardId === revealOnStageRef.current?.scene.revealed.cardId;
    const blocked =
      securityBlowRef.current !== null && !securityBlowRef.current.landed && !securityReveal && !playsItself;
    const step = zoneChangeStep({
      queue,
      presentationBatchRef,
      enqueuePhaseOrderRef,
      setPendingPermanentIds,
      setZoneShowcase,
      setPermanentBursts,
      key,
      showcase: blocked ? null : showcase,
      burst,
      leadInMs,
    });
    if (securityReveal) zoneChanges.push(step);
    else enqueue(step);
    // The board renders a permanent the moment its patch lands, so a card whose arrival is
    // still queued has to be held back from the field until the cue that shows it arriving
    // actually runs — otherwise it is simply there.
    // A player normally watches their own card leave their hand, so only an opponent's play
    // earns the centre-screen hold. A Tamer played from the viewer's Security is different:
    // the player has not seen it arrive yet, and it must stay hidden until the security card
    // has reached its right-hand execution slot.
    if (burst && (showcase || securityReveal !== undefined || revealOnStageRef.current !== null)) {
      arrivalHoldIds.push(burst.permanentId);
      setPendingPermanentIds((held) => new Set(held).add(burst.permanentId));
    }
  }
  // A step a later `replace` drops never runs its own release, and a permanent hidden for
  // good is far worse than one that arrives without its cue, so the board takes every held
  // card back at the latest when nothing is running. Registered after the steps are
  // enqueued: on an idle queue the promise settles at once.
  if (securityReveal === undefined) releaseArrivalHoldsWhenIdle();
  return { arriving, showcased, zoneChanges, firstArrivalIndex, afterShowcaseNotices };
}
