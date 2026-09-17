/* Present one server batch: everything the rules resolved in one entry into the engine.

   The batch is the unit every heuristic here reasons about — the combat lead-in, the
   pairing of a security reveal with its close, what a check played and what that card then
   did. It used to be "the events that arrived since the last render", which made the
   boundary the patch tick; it is now the boundary the server drew.

   The body below is the ordered list of what a batch plays. Each beat lives in its own
   module beside this one; this file owns only the order they run in and the values they
   hand each other. A batch that spans a phase change or a security check is split into
   segments and each segment presented in turn, because those two boundaries are what the
   beats downstream reason about.

   `useMatchCues` owns every ref and setter named in the context below and passes them in
   at call time — nothing here holds state of its own. */

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { GameState, Seat, ServerEvent } from "@aegis/shared";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import type { EffectActivation, EffectSourceLookup } from "../../effectSource";
import type { FieldClashScene, OpenAttack } from "../../fieldClash";
import type { MatchNotice } from "../../notices";
import type { PresentationProgress } from "../../presentationProgress";
import type { SidePanel, SidePanelLookup, AttackAnnouncement } from "../../sidePanels";
import type { SoundKind } from "../../../design/sound";
import type { PermanentBurst, ZoneShowcase } from "../../showcases";
import type { SecurityBranchScene, SecurityClashAttacker, SecurityClashScene } from "../../securityClash";
import type { Side } from "../../side";
import type { AttackLunge, DeleteBurst, MatchCueAnchors, RevealOnStage, SecurityBreakCue } from "../types";
import { securityCheckSegments } from "../../securityClash";
import { hasTurnStartDraw } from "../../showcases";
import { TIMINGS } from "../../timings";
import { otherSeat } from "../../boardModel";
import { CueTrack } from "../enums";
import { withoutId } from "../eventLookup";
import { batchFacts } from "./batchFacts";
import { combatScenes } from "./combat";
import { collectBatchAnnouncements } from "./announcements";
import { enqueueArrivals } from "./arrivals";
import { enqueueAttackAnnouncement } from "./attackAnnouncement";
import { presentSecurityAttack } from "./attackLunge";
import { enqueueCombatImpact } from "./combatImpact";
import { enqueueDeletionBursts } from "./deletionBursts";
import { enqueueSecurityDestructions } from "./securityDestructions";
import { enqueueOptionDock } from "./optionDock";
import { routeBatchNotices } from "./noticeRouting";
import { enqueueBatchSounds } from "./sounds";
import { enqueueDeckRiffles } from "./deckRiffles";
import { enqueueEffectSources } from "./effectSources";
import { enqueueSecurityGrowth } from "./securityGrowth";
import { securityRevealScene } from "./securityRevealScene";
import { presentSecurityClose } from "./securityClose";
import { presentSecurityRevealed } from "./securityReveal";
import {
  createPresentationGate,
  type DeletionReadyAt,
  type PendingAnnounceGate,
  type PresentationGate,
} from "../presentationGate";

/** How `useMatchCues` re-enters this pass for one segment of a split batch. */
export type PresentSegment = (
  batchId: string,
  stateVersion: number,
  fresh: readonly ServerEvent[],
  replayingHistory: boolean,
  continuingBatch?: boolean,
) => void;

export function presentServerBatch({
  batchId,
  stateVersion,
  fresh,
  replayingHistory,
  continuingBatch,
  present,
  viewerSeat,
  state,
  anchors,
  queue,
  progress,
  phaseOrderFor,
  onActionRejected,
  playCue,
  narrate,
  openHeld,
  flushHeldNotices,
  launchDrawFlight,
  launchDeckToUnderFlight,
  launchSecurityGainFlight,
  securityCountOf,
  holdSecurityCard,
  releaseSecurityCard,
  releaseSecurityCardWhenIdle,
  enqueuePhaseOrderRef,
  completedPhaseOrderRef,
  lastBatchIdRef,
  presentationBatchRef,
  batchVersionsRef,
  heldOriginsRef,
  fieldClashKeyRef,
  openAttackRef,
  lastVisibleArtRef,
  revealOnStageRef,
  pendingDigivolutionDrawRef,
  eventDrawCountsRef,
  drawPhaseWaitingRef,
  sidePanelLookupRef,
  sidePanelSequenceRef,
  noticeSequenceRef,
  securityEffectPendingRef,
  showcaseKeyRef,
  cardSiteRef,
  effectSourceKeyRef,
  deckRiffleKeyRef,
  securityGrowthClaimedRef,
  turnStartDrawRef,
  optionDockKeyRef,
  optionDockRef,
  decisionPendingRef,
  heldNoticesRef,
  heldPanelsRef,
  queuedSecurityKeyRef,
  securityDockRef,
  securityHoldRef,
  securityBlowRef,
  blowHoldState,
  setHeldBlowState,
  causingEffectGateRef,
  effectAnnounceGateRef,
  pendingAnnounceGateRef,
  securityClashKeyRef,
  securityAttackerRef,
  pendingDestructionsRef,
  deleteBurstKeyRef,
  deletionReadyAtRef,
  deletionBurstPresentedRef,
  setPendingPermanentIds,
  setHeldDrawState,
  setZoneShowcase,
  setPermanentBursts,
  setEffectSources,
  setDeckRiffles,
  setSecurityFlights,
  setAttackAnnouncement,
  setAttackLunge,
  setSecurityBreak,
  setSecurityHitSeat,
  setSecurityClash,
  setSecurityBranch,
  setPendingRevealKey,
  setOptionBranch,
  setFieldClash,
  setCombatImpactIds,
  setDeleteBursts,
}: {
  batchId: string;
  stateVersion: number;
  fresh: readonly ServerEvent[];
  replayingHistory: boolean;
  /** True for every segment after the first of a batch this pass had to split. */
  continuingBatch: boolean;
  present: PresentSegment;
  viewerSeat: Seat;
  state: GameState | undefined;
  anchors: MatchCueAnchors;
  queue: AnimationQueue;
  progress: PresentationProgress;
  phaseOrderFor: (events: readonly ServerEvent[]) => number;
  onActionRejected: (reason: string) => void;
  playCue: (kind: SoundKind) => void;
  narrate: (notices: readonly MatchNotice[], panels: readonly SidePanel[], batchId: string) => void;
  openHeld: (ownNotices: readonly MatchNotice[], ownPanels: readonly SidePanel[]) => void;
  flushHeldNotices: () => void;
  launchDrawFlight: (side: Side, burst: boolean, delayMs: number) => void;
  launchDeckToUnderFlight: (seat: Seat, permanentId: string) => void;
  launchSecurityGainFlight: (seat: Seat) => void;
  securityCountOf: (seat: Seat) => number | undefined;
  holdSecurityCard: (key: number, seat: Seat, count: number | undefined) => void;
  releaseSecurityCard: (key: number) => void;
  releaseSecurityCardWhenIdle: (key: number) => void;
  enqueuePhaseOrderRef: MutableRefObject<number | undefined>;
  completedPhaseOrderRef: MutableRefObject<number>;
  lastBatchIdRef: MutableRefObject<string>;
  presentationBatchRef: MutableRefObject<{ batchId: string; stateVersion: number } | undefined>;
  batchVersionsRef: MutableRefObject<Map<string, number>>;
  heldOriginsRef: MutableRefObject<WeakMap<object, { batchId: string; stateVersion: number; phaseOrder: number }>>;
  fieldClashKeyRef: MutableRefObject<number>;
  openAttackRef: MutableRefObject<OpenAttack | null>;
  lastVisibleArtRef: MutableRefObject<Map<string, string>>;
  revealOnStageRef: MutableRefObject<RevealOnStage | null>;
  pendingDigivolutionDrawRef: MutableRefObject<Set<Seat>>;
  eventDrawCountsRef: MutableRefObject<{ you?: number; opp?: number }>;
  drawPhaseWaitingRef: MutableRefObject<Seat | null>;
  sidePanelLookupRef: MutableRefObject<SidePanelLookup>;
  sidePanelSequenceRef: MutableRefObject<number>;
  noticeSequenceRef: MutableRefObject<number>;
  securityEffectPendingRef: MutableRefObject<boolean>;
  showcaseKeyRef: MutableRefObject<number>;
  cardSiteRef: MutableRefObject<{
    locate: EffectSourceLookup;
    seatOf: (instanceId: string) => Seat | undefined;
    topInstanceOf: (permanentId: string) => string | undefined;
  }>;
  effectSourceKeyRef: MutableRefObject<number>;
  deckRiffleKeyRef: MutableRefObject<number>;
  securityGrowthClaimedRef: MutableRefObject<Set<Seat>>;
  turnStartDrawRef: MutableRefObject<{ you: boolean; opp: boolean }>;
  optionDockKeyRef: MutableRefObject<number>;
  optionDockRef: MutableRefObject<{ key: number; closed: boolean } | null>;
  decisionPendingRef: MutableRefObject<boolean>;
  heldNoticesRef: MutableRefObject<readonly MatchNotice[]>;
  heldPanelsRef: MutableRefObject<readonly SidePanel[]>;
  queuedSecurityKeyRef: MutableRefObject<number | null>;
  securityDockRef: MutableRefObject<{ key: number; closed: boolean } | null>;
  securityHoldRef: MutableRefObject<{ key: number; closed: boolean; handedOver?: boolean } | null>;
  securityBlowRef: MutableRefObject<{ key: number; landed: boolean; gate: PresentationGate } | null>;
  blowHoldState: () => GameState | undefined;
  setHeldBlowState: Dispatch<SetStateAction<GameState | undefined>>;
  causingEffectGateRef: MutableRefObject<PresentationGate | null>;
  effectAnnounceGateRef: MutableRefObject<PresentationGate | null>;
  pendingAnnounceGateRef: MutableRefObject<PendingAnnounceGate | null>;
  securityClashKeyRef: MutableRefObject<number>;
  securityAttackerRef: MutableRefObject<SecurityClashAttacker | undefined>;
  pendingDestructionsRef: MutableRefObject<number>;
  deleteBurstKeyRef: MutableRefObject<number>;
  deletionReadyAtRef: MutableRefObject<Map<string, DeletionReadyAt>>;
  deletionBurstPresentedRef: MutableRefObject<Set<string>>;
  setPendingPermanentIds: Dispatch<SetStateAction<ReadonlySet<string>>>;
  setHeldDrawState: Dispatch<SetStateAction<{ seat: Seat; state: GameState } | undefined>>;
  setZoneShowcase: Dispatch<SetStateAction<ZoneShowcase | null>>;
  setPermanentBursts: Dispatch<SetStateAction<ReadonlyMap<string, PermanentBurst>>>;
  setEffectSources: Dispatch<SetStateAction<readonly EffectActivation[]>>;
  setDeckRiffles: Dispatch<SetStateAction<ReadonlySet<string>>>;
  setSecurityFlights: Dispatch<SetStateAction<ReadonlySet<number>>>;
  setAttackAnnouncement: Dispatch<SetStateAction<AttackAnnouncement | null>>;
  setAttackLunge: Dispatch<SetStateAction<AttackLunge | null>>;
  setSecurityBreak: Dispatch<SetStateAction<SecurityBreakCue | null>>;
  setSecurityHitSeat: Dispatch<SetStateAction<number | null>>;
  setSecurityClash: Dispatch<SetStateAction<SecurityClashScene | null>>;
  setSecurityBranch: Dispatch<SetStateAction<SecurityBranchScene | null>>;
  setPendingRevealKey: Dispatch<SetStateAction<number | null>>;
  setOptionBranch: Dispatch<SetStateAction<SecurityBranchScene | null>>;
  setFieldClash: Dispatch<SetStateAction<FieldClashScene | null>>;
  setCombatImpactIds: Dispatch<SetStateAction<ReadonlySet<string>>>;
  setDeleteBursts: Dispatch<SetStateAction<readonly DeleteBurst[]>>;
}) {
  const phaseSegments: ServerEvent[][] = [];
  for (const event of fresh) {
    if (phaseSegments.length === 0 || event.kind === "phaseChanged" || event.kind === "turnEnded")
      phaseSegments.push([]);
    phaseSegments.at(-1)!.push(event);
  }
  const segments = phaseSegments.flatMap(securityCheckSegments);
  if (segments.length > 1) {
    for (const [index, segment] of segments.entries()) {
      present(batchId, stateVersion, segment, replayingHistory, continuingBatch || index > 0);
    }
    return;
  }
  enqueuePhaseOrderRef.current = phaseOrderFor(fresh);
  // Whatever this batch queues waits on the announcement the batch before it is still
  // reading out, so a consequence never overtakes the clause that caused it.
  causingEffectGateRef.current = effectAnnounceGateRef.current;
  lastBatchIdRef.current = batchId;
  // Everything enqueued from here belongs to this batch, and the board it is narrated
  // over is the board this batch produced.
  presentationBatchRef.current = { batchId, stateVersion };
  batchVersionsRef.current.set(batchId, stateVersion);
  if (batchVersionsRef.current.size > 120)
    batchVersionsRef.current.delete(batchVersionsRef.current.keys().next().value!);
  if (!replayingHistory && !continuingBatch) progress.present(batchId, stateVersion);
  const {
    refusal,
    securityReveal,
    closesFreshReveal,
    securityCheck,
    closingCheck,
    turnEnd,
    securityAttack,
    redirectedOffPlayer,
    usedOption,
    optionRouted,
  } = batchFacts({ fresh });
  /**
   * An attack owns the screen for its call-out, the way a played card owns it for its
   * showcase. A [When Attacking] clause resolves in the same batch as the declaration that
   * fired it, so with no lead-in its draw and its toast land on the very frame of the lunge
   * — the clause going off before the attack that triggered it has been read. It waits the
   * same beat `attackAnnounce` gives the call-out, for the same reason `effectAnnounce`
   * gives one to an [On Play].
   */
  const attackLeadInMs = fresh.some((event) => event.kind === "attackDeclared") ? TIMINGS.attackAnnounce : 0;
  // Replayed steps still run, so their state lands in the right place — they
  // just run with every wait collapsed, which is no animation at all.
  const batchPhaseOrder = enqueuePhaseOrderRef.current;
  const enqueue = (step: AnimationStep) =>
    queue.enqueue({
      ...step,
      origin: { batchId, stateVersion, phaseOrder: batchPhaseOrder },
      ...(replayingHistory ? { mode: "replay" as const } : {}),
    });
  if (optionRouted && optionDockRef.current) optionDockRef.current.closed = true;
  // A permanent that lost a battle takes the claw and the shake first, and its
  // burst waits behind them — the reference client hits the card, then breaks
  // it. Only combat deletions get the impact; an effect deletion has no blow
  // to land. A battle whose defender is known plays the whole scene — arrow,
  // lunge, then the blow — so its losers wait on the longer clock.
  const { beaten, clashScenes, clashLoserIds, combatLeadInMs } = combatScenes({
    fresh,
    viewerSeat,
    fieldClashKeyRef,
    openAttackRef,
    anchors,
    lastVisibleArtRef,
  });
  // Notices a security check owns. They read as what the revealed card did, so they
  // are handed to the centre-stage sequence below instead of being raised here, where
  // they would talk over — or ahead of — the reveal they describe.
  let heldNotices: readonly MatchNotice[] = [];
  /** The side panels those notices belong with; they wait on the same cue. */
  let heldPanels: readonly SidePanel[] = [];
  /* What a card the check PLAYED went on to do. Nothing here may reach the screen
     before that card has been seen arriving on the field, so it waits one cue longer
     than the check's own clause does. */
  let afterArrivalNotices: readonly MatchNotice[] = [];
  let afterArrivalPanels: readonly SidePanel[] = [];
  /** The arrival cues themselves, held back so the check can take the screen first. */
  let deferredZoneChanges: readonly AnimationStep[] = [];
  /** A closing check first moves its revealed card to the execution slot at the right. */
  let deferredSecurityArrivalsQueued = false;
  /**
   * How long the beats that explain an announced play own the screen before anything
   * that play caused may be narrated: the card held centre-stage under its
   * call-out, then the clause it triggered. The battle's `combatLeadInMs` above is the
   * same idea one step earlier in the chain, and the two stack.
   */
  let playLeadInMs = 0;
  /** Permanents kept off the board until their arrival cue has actually run. */
  const arrivalHoldIds: string[] = [];
  function releaseArrivalHoldsWhenIdle() {
    if (arrivalHoldIds.length === 0) return;
    const ids = [...arrivalHoldIds];
    void queue.idle().then(() => {
      setPendingPermanentIds((held) => ids.reduce((next, id) => withoutId(next, id), held));
    });
  }
  function enqueueDeferredSecurityArrivals(key: number) {
    if (deferredSecurityArrivalsQueued) return;
    deferredSecurityArrivalsQueued = true;
    // A free play is a consequence of the security card. In a batch that also closes
    // the check, the branch-in cue is still ahead of us on the serial track; enqueueing
    // the arrival before it made the permanent appear before its source reached the
    // execution slot at the right of the board.
    for (const step of deferredZoneChanges) enqueue(step);
    releaseArrivalHoldsWhenIdle();
    if (afterArrivalNotices.length === 0 && afterArrivalPanels.length === 0) return;
    const arrivalNotices = afterArrivalNotices;
    const arrivalPanels = afterArrivalPanels;
    enqueue({
      id: `security-arrival-notices-${key}`,
      track: CueTrack.CenterStage,
      skippable: false,
      run() {
        narrate(arrivalNotices, arrivalPanels, batchId);
      },
    });
  }

  if (!replayingHistory) {
    enqueueBatchSounds({ fresh, viewerSeat, batchId, enqueue, playCue });
    const now = Date.now();
    const deletedThisBatch = new Set(
      fresh.flatMap((event) =>
        event.kind === "cardsMoved"
          ? (event.deletedPermanents ?? []).map((deleted) => `${deleted.seat}:${deleted.cardId}`)
          : [],
      ),
    );
    const announcesEffect = fresh.some(
      (event) => event.kind === "effectTriggered" && !deletedThisBatch.has(`${event.seat}:${event.sourceCardId}`),
    );
    const batchAnnounceGate = announcesEffect ? createPresentationGate() : null;
    if (batchAnnounceGate) {
      pendingAnnounceGateRef.current = { batchId, gate: batchAnnounceGate, deleted: deletedThisBatch };
      causingEffectGateRef.current = batchAnnounceGate;
    }
    const showcasePlays = queue.getMode() === "live";
    const { announcement, opened, raised, panelAt, noticeAt } = collectBatchAnnouncements({
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
    });
    const { arriving, showcased, zoneChanges, firstArrivalIndex, afterShowcaseNotices } = enqueueArrivals({
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
    });
    enqueueEffectSources({
      fresh,
      usedOption,
      combatLeadInMs,
      cardSiteRef,
      effectSourceKeyRef,
      setEffectSources,
      enqueue,
    });
    enqueueDeckRiffles({ fresh, deckRiffleKeyRef, setDeckRiffles, enqueue });
    enqueueSecurityGrowth({
      fresh,
      securityGrowthClaimedRef,
      setSecurityFlights,
      launchSecurityGainFlight,
      enqueue,
    });
    if (hasTurnStartDraw(fresh, viewerSeat)) turnStartDrawRef.current.you = true;
    if (hasTurnStartDraw(fresh, otherSeat(viewerSeat))) turnStartDrawRef.current.opp = true;
    // An On Play / When Digivolving notice reads as the consequence of the card
    // that was just announced, so it waits for the reveal instead of talking
    // over the showcase. Its clock starts when it is finally raised. The side panels
    // the same events opened carry the other half of that consequence — the cards an
    // [On Play] reveal turned up — so they travel with the notices rather than
    // printing the result before the card that caused it has been seen.
    for (const item of [...raised, ...opened])
      heldOriginsRef.current.set(item, {
        batchId,
        stateVersion,
        phaseOrder: enqueuePhaseOrderRef.current ?? completedPhaseOrderRef.current,
      });
    const presenting = raised.length > 0 || opened.length > 0;
    // Nothing this batch raised will carry the gate, so it must not hold the next batch's
    // consequences behind a clause that is never coming.
    if (
      batchAnnounceGate &&
      !raised.some(
        (notice) =>
          notice.body.variant === "effect" &&
          !deletedThisBatch.has(`${notice.side === "you" ? viewerSeat : otherSeat(viewerSeat)}:${notice.body.cardId}`),
      )
    )
      batchAnnounceGate.release();
    enqueueOptionDock({
      usedOption,
      optionRouted,
      viewerSeat,
      optionDockKeyRef,
      optionDockRef,
      decisionPendingRef,
      setOptionBranch,
      enqueue,
    });
    ({ heldNotices, heldPanels, afterArrivalNotices, afterArrivalPanels, deferredZoneChanges, playLeadInMs } =
      routeBatchNotices({
        fresh,
        batchId,
        raised,
        opened,
        noticeAt,
        panelAt,
        presenting,
        arriving,
        showcased,
        showcasePlays,
        afterShowcaseNotices,
        firstArrivalIndex,
        zoneChanges,
        combatLeadInMs,
        securityReveal,
        revealOnStageRef,
        noticeSequenceRef,
        showcaseKeyRef,
        heldNoticesRef,
        heldPanelsRef,
        narrate,
        openHeld,
        enqueue,
      }));
    enqueueAttackAnnouncement({ announcement, setAttackAnnouncement, enqueue });
  }
  if (refusal?.kind === "actionRejected") onActionRejected(refusal.reason);
  presentSecurityAttack({
    securityAttack,
    redirectedOffPlayer,
    viewerSeat,
    cardSiteRef,
    securityAttackerRef,
    setAttackLunge,
    enqueue,
  });
  // A check now reaches the client as two events: `securityRevealed` the moment the card
  // is turned face up, and `securityChecked` once the server has resolved everything that
  // card caused. The scene follows the same split — the card goes on stage at the reveal
  // and plays its scene out there. A check that closes in the same batch takes its outcome
  // beat and its detour to the side; one the server is still resolving lets the card leave
  // at the end of the scene, so its effects read out on a board with nothing on it.
  //
  // The whole check runs on the one centre-screen track, in the reference client's
  // order (battle-animation-spec.md §4b): the shield arms, its glass breaks, the card
  // is revealed and held, and only then does what the card *did* reach the screen —
  // its notice, its detour to the side, the decision it asks for. Serial order is what
  // guarantees that: a parallel track with a fixed lead-in cannot know when this one
  // actually gets to the reveal, so it can and does run ahead of it. The break carries
  // the `replace`, so a check still cancels whatever showcase was mid-flight.
  const stage = securityRevealScene({
    queue,
    enqueue,
    viewerSeat,
    replayingHistory,
    batchId,
    revealOnStageRef,
    queuedSecurityKeyRef,
    securityDockRef,
    securityHoldRef,
    securityBlowRef,
    blowHoldState,
    setHeldBlowState,
    heldNoticesRef,
    heldPanelsRef,
    setSecurityBreak,
    setSecurityHitSeat,
    setSecurityClash,
    setSecurityBranch,
    setPendingRevealKey,
    flushHeldNotices,
    openHeld,
    holdSecurityCard,
    releaseSecurityCard,
    releaseSecurityCardWhenIdle,
    securityCountOf,
  });

  if (securityReveal?.kind === "securityRevealed")
    presentSecurityRevealed({
      securityReveal,
      closingCheck,
      viewerSeat,
      heldNotices,
      heldPanels,
      securityClashKeyRef,
      securityAttackerRef,
      revealOnStageRef,
      heldNoticesRef,
      heldPanelsRef,
      stage,
      enqueueDeferredSecurityArrivals,
    });
  if (securityCheck?.kind === "securityChecked")
    presentSecurityClose({
      securityCheck,
      closingCheck,
      closesFreshReveal,
      viewerSeat,
      heldNotices,
      heldPanels,
      securityClashKeyRef,
      securityAttackerRef,
      securityHoldRef,
      revealOnStageRef,
      heldNoticesRef,
      heldPanelsRef,
      setSecurityClash,
      setSecurityBranch,
      stage,
      enqueueDeferredSecurityArrivals,
      enqueue,
    });
  enqueueSecurityDestructions({
    fresh,
    viewerSeat,
    replayingHistory,
    queue,
    sidePanelLookupRef,
    securityClashKeyRef,
    pendingDestructionsRef,
    setSecurityBreak,
    setSecurityHitSeat,
    setSecurityClash,
    setPendingRevealKey,
    securityCountOf,
    holdSecurityCard,
    releaseSecurityCard,
    releaseSecurityCardWhenIdle,
    releaseSecurityPresentation: stage.releaseSecurityPresentation,
    enqueue,
  });
  enqueueCombatImpact({
    clashScenes,
    beaten,
    setFieldClash,
    setAttackLunge,
    setCombatImpactIds,
    enqueue,
  });
  enqueueDeletionBursts({
    queue,
    fresh,
    beaten,
    clashLoserIds,
    playLeadInMs,
    anchors,
    deleteBurstKeyRef,
    deletionReadyAtRef,
    deletionBurstPresentedRef,
    securityBlowRef,
    causingEffectGate: causingEffectGateRef.current,
    setDeleteBursts,
    enqueue,
  });
  /**
   * A [Security] effect that PLAYS its own card leaves the dock nothing to show: the card
   * is on the field now, so the dock goes at that play rather than waiting for the eventual
   * `securityChecked` — otherwise the [On Play] clause and the cards it reveals read from
   * behind a card that has already moved. A security card whose effect does NOT play it
   * keeps its dock until the check closes. Last in the pass, so the played card's own
   * arrival cue is already queued ahead of the dock's exit.
   */
  const dockedReveal = revealOnStageRef.current;
  if (
    dockedReveal?.docked === true &&
    securityDockRef.current?.key === dockedReveal.key &&
    fresh.some((event) => event.kind === "cardPlayed" && event.cardId === dockedReveal.scene.revealed.cardId)
  ) {
    stage.undockSecurityReveal(dockedReveal.key);
    // Seen and gone, not forgotten: the eventual close must not stage the card again.
    revealOnStageRef.current = { ...dockedReveal, docked: false, exited: true };
  }
  if (turnEnd?.kind === "turnEnded") {
    securityAttackerRef.current = undefined;
    securityEffectPendingRef.current = false;
    // No check survives its turn, so a dock still waiting for a close it will never get
    // is let go here rather than holding the centre-stage track into the next turn.
    if (securityDockRef.current) securityDockRef.current.closed = true;
    // No check survives its turn: anything still held has no reveal left to wait
    // for, and no close left to hand the board back. A check observed this pass still
    // owns its queued flush and its own release, so it keeps both.
    if (!securityCheck) {
      flushHeldNotices();
      setPendingRevealKey(null);
    }
  }
}
