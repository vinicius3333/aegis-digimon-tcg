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
import { eventChangesPresentedBoard } from "../../animationCatalog";
import type { FlyPlayedCard } from "../flights";
import type { EffectActivation, EffectSourceLookup } from "../../effectSource";
import type { FieldClashScene, OpenAttack } from "../../fieldClash";
import type { MatchNotice } from "../../notices";
import type { PresentationProgress } from "../../presentationProgress";
import type { SidePanel, SidePanelLookup, AttackAnnouncement } from "../../sidePanels";
import type { SoundKind } from "../../../design/sound";
import type { PermanentBurst, ZoneShowcase } from "../../showcases";
import type { SecurityBranchScene, SecurityClashAttacker, SecurityClashScene } from "../../securityClash";
import type { Side } from "../../side";
import type { StateSnapshot } from "../../../net/presentedState";
import type {
  AttackLunge,
  DeleteBurst,
  DrawFlightCard,
  HeldDeletion,
  MatchCueAnchors,
  RevealOnStage,
  SecurityBreakCue,
  SecurityClause,
} from "../types";
import { securityCheckSegments } from "../../securityClash";
import { fieldDeparturesFromEvent, hasTurnStartDraw } from "../../showcases";
import { costClauseFromEvent } from "./costClause";
import { TIMINGS } from "../../timings";
import { otherSeat } from "../../boardModel";
import { CueTrack } from "../enums";
import { activePacing } from "../../pacing";
import type { PresentationPacing } from "../../presentationProbe";
import { withoutId } from "../eventLookup";
import { batchFacts } from "./batchFacts";
import { combatScenes } from "./combat";
import { collectBatchAnnouncements } from "./announcements";
import { enqueueArrivals } from "./arrivals";
import { enqueueAttackAnnouncement } from "./attackAnnouncement";
import { presentSecurityAttack } from "./attackLunge";
import { enqueueCombatImpact } from "./combatImpact";
import { traceCueBatch } from "../../cueTrace";
import { enqueueDeletionBursts } from "./deletionBursts";
import type { RemovalLink } from "../removalChain";
import { enqueueDeckReturns, type FlyCardToDeck } from "./deckReturns";
import { enqueueStackStripPeels } from "./stackStripPeels";
import { enqueueSecurityDestructions } from "./securityDestructions";
import { enqueueOptionDock, type FlyDockedOptionUnder, type OptionDockHold } from "./optionDock";
import { enqueueRevealShowcases, revealShowcasesFromEvents, type RevealShowcase } from "./revealShowcases";
import { routeBatchNotices } from "./noticeRouting";
import { enqueueBatchSounds } from "./sounds";
import { enqueueDeckRiffles } from "./deckRiffles";
import { enqueueEffectSources } from "./effectSources";
import { enqueueSecurityGrowth } from "./securityGrowth";
import { enqueueMemoryHold, type MemoryHold } from "./memoryHold";
import { securityRevealScene } from "./securityRevealScene";
import { presentSecurityClose } from "./securityClose";
import { presentSecurityRevealed } from "./securityReveal";
import { refreshSecurityAttacker } from "./securityAttackerRefresh";
import { effectUnitSteps, resumedUnitSteps, type EffectSequence, type ObservedBatch } from "../effectSequence";
import {
  createPresentationGate,
  waitForGate,
  type DeletionReadyAt,
  type PendingAnnounceGate,
  type CostClause,
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

/**
 * The board a batch that announces an effect is narrated over. The server can emit an
 * effect's first results in the same batch as its `effectTriggered`, and that batch's board
 * already shows them: the clause would be read over its own outcome. Such a batch is held at
 * the board before it, and the outcome reaches the board once the batch's beats are done.
 */
export function announcedBoardVersion(
  events: readonly ServerEvent[],
  sequenced: ObservedBatch,
  stateVersion: number,
): number {
  const opensAt = sequenced.opened[0]?.eventIndex;
  if (opensAt === undefined) return stateVersion;
  const changesBoard = eventChangesPresentedBoard;
  const resultsBefore = events.slice(0, opensAt).some(changesBoard);
  const resultsAfter = events.slice(opensAt + 1).some(changesBoard);
  return resultsAfter && !resultsBefore ? stateVersion - 1 : stateVersion;
}

export function presentServerBatch({
  batchId,
  stateVersion,
  fresh,
  replayingHistory,
  continuingBatch,
  present,
  presentationPacingRef,
  effectSequence,
  batchOf,
  viewerSeat,
  state,
  snapshots,
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
  flyDockedOptionUnder,
  flyCardToDeck,
  flyPlayedCard,
  releaseTrashArrivalsThrough,
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
  securityClausesReadRef,
  showcaseKeyRef,
  revealShowcaseKeyRef,
  cardSiteRef,
  effectSourceKeyRef,
  deckRiffleKeyRef,
  securityGrowthClaimedRef,
  memoryHoldKeyRef,
  presentedTurnSeatRef,
  turnStartDrawRef,
  optionDockKeyRef,
  optionDockRef,
  decisionPendingRef,
  decisionSourceCardIdRef,
  heldNoticesRef,
  heldPanelsRef,
  queuedSecurityKeyRef,
  securityDockRef,
  securityHoldRef,
  securityBlowRef,
  blowHoldState,
  setHeldBlowState,
  securityEffectHoldState,
  setHeldSecurityEffectState,
  securityClauseGateRef,
  causingEffectGateRef,
  effectAnnounceGateRef,
  pendingAnnounceGateRef,
  costClauseRef,
  securityClashKeyRef,
  securityAttackerRef,
  pendingDestructionsRef,
  deleteBurstKeyRef,
  deletionReadyAtRef,
  deletionBurstPresentedRef,
  removalChainRef,
  setPendingPermanentIds,
  setHeldDrawState,
  setZoneShowcase,
  setRevealShowcase,
  setPermanentBursts,
  setEffectSources,
  setDeckRiffles,
  setSecurityFlights,
  setHeldMemory,
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
  setHeldDeletions,
}: {
  batchId: string;
  stateVersion: number;
  fresh: readonly ServerEvent[];
  replayingHistory: boolean;
  /** True for every segment after the first of a batch this pass had to split. */
  continuingBatch: boolean;
  present: PresentSegment;
  /** How simultaneous effects are paced. */
  presentationPacingRef: MutableRefObject<PresentationPacing>;
  /** The effect units sequential pacing plays one at a time. */
  effectSequence: EffectSequence;
  /** The server batch a queued step belongs to, however it was enqueued. */
  batchOf: (step: AnimationStep) => string | undefined;
  viewerSeat: Seat;
  state: GameState | undefined;
  /** The boards the presentation has passed through, newest last. */
  snapshots: readonly StateSnapshot[];
  anchors: MatchCueAnchors;
  queue: AnimationQueue;
  progress: PresentationProgress;
  phaseOrderFor: (events: readonly ServerEvent[]) => number;
  onActionRejected: (reason: string) => void;
  playCue: (kind: SoundKind) => void;
  narrate: (notices: readonly MatchNotice[], panels: readonly SidePanel[], batchId: string) => void;
  openHeld: (ownNotices: readonly MatchNotice[], ownPanels: readonly SidePanel[]) => void;
  flushHeldNotices: () => void;
  launchDrawFlight: (side: Side, burst: boolean, delayMs: number, card?: DrawFlightCard) => void;
  launchDeckToUnderFlight: (seat: Seat, permanentId: string) => void;
  flyDockedOptionUnder: FlyDockedOptionUnder;
  flyCardToDeck: FlyCardToDeck;
  flyPlayedCard?: FlyPlayedCard;
  releaseTrashArrivalsThrough: (stateVersion: number) => void;
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
  securityClausesReadRef: MutableRefObject<Set<string>>;
  showcaseKeyRef: MutableRefObject<number>;
  revealShowcaseKeyRef: MutableRefObject<number>;
  cardSiteRef: MutableRefObject<{
    locate: EffectSourceLookup;
    seatOf: (instanceId: string) => Seat | undefined;
    topInstanceOf: (permanentId: string) => string | undefined;
  }>;
  effectSourceKeyRef: MutableRefObject<number>;
  deckRiffleKeyRef: MutableRefObject<number>;
  securityGrowthClaimedRef: MutableRefObject<Map<Seat, number>>;
  memoryHoldKeyRef: MutableRefObject<number>;
  /** Mutated: follows the turn across the batches as they are presented. */
  presentedTurnSeatRef: MutableRefObject<Seat>;
  turnStartDrawRef: MutableRefObject<{ you: boolean; opp: boolean }>;
  optionDockKeyRef: MutableRefObject<number>;
  optionDockRef: MutableRefObject<OptionDockHold | null>;
  decisionPendingRef: MutableRefObject<boolean>;
  decisionSourceCardIdRef?: MutableRefObject<string | undefined>;
  heldNoticesRef: MutableRefObject<readonly MatchNotice[]>;
  heldPanelsRef: MutableRefObject<readonly SidePanel[]>;
  queuedSecurityKeyRef: MutableRefObject<number | null>;
  securityDockRef: MutableRefObject<{ key: number; closed: boolean } | null>;
  securityHoldRef: MutableRefObject<{ key: number; closed: boolean; handedOver?: boolean } | null>;
  securityBlowRef: MutableRefObject<{ key: number; landed: boolean; gate: PresentationGate } | null>;
  /** The board the battle is fought on; `true` stands the attacker as the reveal found it. */
  blowHoldState: (attackerAsRevealed?: boolean) => GameState | undefined;
  setHeldBlowState: Dispatch<SetStateAction<GameState | undefined>>;
  securityEffectHoldState: () => GameState | undefined;
  setHeldSecurityEffectState: Dispatch<SetStateAction<GameState | undefined>>;
  securityClauseGateRef: MutableRefObject<SecurityClause | null>;
  causingEffectGateRef: MutableRefObject<PresentationGate | null>;
  effectAnnounceGateRef: MutableRefObject<PresentationGate | null>;
  pendingAnnounceGateRef: MutableRefObject<PendingAnnounceGate | null>;
  /** The ＜Delay＞ clause whose Option break, toast and played card are being kept in order. */
  costClauseRef: MutableRefObject<CostClause | null>;
  securityClashKeyRef: MutableRefObject<number>;
  securityAttackerRef: MutableRefObject<SecurityClashAttacker | undefined>;
  pendingDestructionsRef: MutableRefObject<number>;
  deleteBurstKeyRef: MutableRefObject<number>;
  deletionReadyAtRef: MutableRefObject<Map<string, DeletionReadyAt>>;
  deletionBurstPresentedRef: MutableRefObject<Set<string>>;
  /** The latest card an effect took off the field, which the next one follows. */
  removalChainRef: MutableRefObject<RemovalLink | null>;
  setPendingPermanentIds: Dispatch<SetStateAction<ReadonlySet<string>>>;
  setHeldDrawState: Dispatch<SetStateAction<{ seat: Seat; state: GameState } | undefined>>;
  setZoneShowcase: Dispatch<SetStateAction<ZoneShowcase | null>>;
  setRevealShowcase: Dispatch<SetStateAction<RevealShowcase | null>>;
  setPermanentBursts: Dispatch<SetStateAction<ReadonlyMap<string, PermanentBurst>>>;
  setEffectSources: Dispatch<SetStateAction<readonly EffectActivation[]>>;
  setDeckRiffles: Dispatch<SetStateAction<ReadonlySet<string>>>;
  setSecurityFlights: Dispatch<SetStateAction<ReadonlySet<number>>>;
  setHeldMemory: Dispatch<SetStateAction<MemoryHold | undefined>>;
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
  setHeldDeletions: Dispatch<SetStateAction<ReadonlyMap<number, HeldDeletion>>>;
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
  // Sequential pacing: which effect unit this batch announces or carries the results of.
  const sequential = presentationPacingRef.current === "sequential" && !replayingHistory;
  const earlierUnitsSettled = sequential ? effectSequence.unsettled() : null;
  const sequenced = sequential ? effectSequence.observeBatch(batchId, stateVersion, fresh) : undefined;
  const unitGate = sequenced?.owner?.announced ?? null;
  // Whatever this batch queues waits on the announcement the batch before it is still
  // reading out, so a consequence never overtakes the clause that caused it.
  causingEffectGateRef.current = unitGate ?? effectAnnounceGateRef.current;
  // A security card still on its way to the dock caused whatever this batch does, and its
  // clause has not been read out yet.
  // Under sequential pacing the effect that owns this batch already names its cause.
  if (!unitGate && securityClauseGateRef.current?.gate.open === false)
    causingEffectGateRef.current = securityClauseGateRef.current.gate;
  lastBatchIdRef.current = batchId;
  // Everything enqueued from here belongs to this batch, and the board it is narrated
  // over is the board this batch produced.
  presentationBatchRef.current = { batchId, stateVersion };
  batchVersionsRef.current.set(batchId, stateVersion);
  if (batchVersionsRef.current.size > 120)
    batchVersionsRef.current.delete(batchVersionsRef.current.keys().next().value!);
  if (!replayingHistory && !continuingBatch)
    progress.present(
      batchId,
      // A resumed unit's first results batch waits out the fresh beat over the board before it.
      sequenced?.resumed
        ? stateVersion - 1
        : sequenced
          ? announcedBoardVersion(fresh, sequenced, stateVersion)
          : stateVersion,
    );
  if (!replayingHistory) traceCueBatch(`${batchId} ${fresh.map((event) => event.kind).join(",")}`);
  const {
    refusal,
    securityReveal,
    closesFreshReveal,
    securityCheck,
    closingCheck,
    turnEnd,
    securityAttack,
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
  /* Sequential pacing: a batch that no open effect carries is what the server did after the
     effects still playing, a security check or the play that raised a new trigger. The centre
     stage takes it only once those effects have settled. A batch an open effect carries, or
     one that repeats a trigger waiting to be announced, belongs to that effect's own beats.
     Each centre-stage step waits inside its own run: a security break replaces whatever its
     track holds, so a separate waiting step ahead of it would be dropped. */
  const unsettled =
    sequenced && !sequenced.carriedBy && sequenced.grouped.length === 0 && !sequenced.resumed
      ? earlierUnitsSettled
      : null;
  const afterEarlierUnits = (step: AnimationStep): AnimationStep =>
    unsettled && step.track === CueTrack.CenterStage
      ? afterGate(step, unsettled, activePacing().budgetCeilingMs, "centerStage/effectUnitsSettled")
      : step;
  const enqueue = (step: AnimationStep) =>
    queue.enqueue({
      ...afterEarlierUnits(step),
      origin: { batchId, stateVersion, phaseOrder: batchPhaseOrder },
      ...(replayingHistory ? { mode: "replay" as const } : {}),
    });
  const optionRoutedUnder = fresh.find(
    (event) => event.kind === "cardsMoved" && event.optionUsed === true && event.placedUnder !== undefined,
  );
  const routedUnderPermanentId =
    optionRoutedUnder?.kind === "cardsMoved" ? optionRoutedUnder.placedUnder?.permanentId : undefined;
  if (optionRouted && optionDockRef.current && !optionDockRef.current.closed) {
    optionDockRef.current.closed = true;
    optionDockRef.current.routedAtVersion = stateVersion;
    if (routedUnderPermanentId !== undefined) optionDockRef.current.routedUnderPermanentId = routedUnderPermanentId;
  }
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
  // Start the field battle before a Piercing continuation can enqueue its security scene.
  // The shield step observes this track and waits until Raid's redirected battle has landed.
  enqueueCombatImpact({
    clashScenes,
    beaten,
    setFieldClash,
    setAttackLunge,
    setCombatImpactIds,
    enqueue,
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
    if (unitGate) {
      // What came before the batch's first announcement caused it; what came after is its result.
      const firstAnnounced = sequenced?.opened[0]?.eventIndex ?? 0;
      enqueueBatchSounds({ fresh: fresh.slice(0, firstAnnounced), viewerSeat, batchId, enqueue, playCue });
      enqueueBatchSounds({
        fresh: fresh.slice(firstAnnounced),
        viewerSeat,
        batchId,
        enqueue: (step) => enqueue(afterGate(step, unitGate)),
        playCue,
      });
    } else enqueueBatchSounds({ fresh, viewerSeat, batchId, enqueue, playCue });
    const now = Date.now();
    const deletedThisBatch = new Set(
      fresh.flatMap((event) =>
        fieldDeparturesFromEvent(event).map((departed) => `${departed.seat}:${departed.cardId}`),
      ),
    );
    const announcesEffect = fresh.some(
      (event) =>
        event.kind === "effectTriggered" &&
        ((event.description?.startsWith("[Granted]") && !/delet|destroy/i.test(event.timing ?? "")) ||
          !deletedThisBatch.has(`${event.seat}:${event.sourceCardId}`)),
    );
    const batchAnnounceGate = announcesEffect ? createPresentationGate() : null;
    if (batchAnnounceGate) {
      pendingAnnounceGateRef.current = { batchId, gate: batchAnnounceGate, deleted: deletedThisBatch };
      causingEffectGateRef.current = unitGate ?? batchAnnounceGate;
    }
    for (const event of fresh) {
      const clause = costClauseFromEvent(event);
      if (clause) costClauseRef.current = clause;
    }
    // What the clause plays waits for it to be read; once it has been, arrivals go on as usual.
    const pendingCostClause = costClauseRef.current?.read.open === false ? costClauseRef.current : null;
    const showcasePlays = queue.getMode() === "live";
    // A security check owns the centre of the screen and reads its card's reveals beside it,
    // so a reveal it causes stays in the narration panel instead of competing for the stage.
    const revealShowcases =
      showcasePlays && !securityReveal && revealOnStageRef.current === null
        ? revealShowcasesFromEvents(fresh, viewerSeat, () => (revealShowcaseKeyRef.current += 1))
        : [];
    const collected = collectBatchAnnouncements({
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
      securityClausesReadRef,
      launchDrawFlight,
      launchDeckToUnderFlight,
      setHeldDrawState,
    });
    // A trigger that joined an earlier unit shares its "×N" clause. Each accepted physical
    // source still focuses, so the viewer can see which copies paid their activation cost.
    const groupedAt = new Set(sequenced?.grouped.map(({ eventIndex }) => eventIndex));
    const { announcement, opened, panelAt } = collected;
    const kept = collected.raised.flatMap((notice, index) =>
      groupedAt.has(collected.noticeAt[index]!) ? [] : [{ notice, at: collected.noticeAt[index]! }],
    );
    const raised = kept.map(({ notice }) => notice);
    const noticeAt = kept.map(({ at }) => at);
    const resumed = sequenced?.resumed;
    // A resumed effect lights its source again for its fresh beat: the prompt that covered
    // the board is gone, and this is the card whose answer now plays out.
    const relit: ServerEvent[] = resumed
      ? [
          {
            kind: "effectTriggered",
            seat: resumed.seat,
            sourceCardId: resumed.sourceCardId,
            effectKey: resumed.effectKey,
            description: resumed.description,
            ...(resumed.sourceInstanceId !== undefined ? { sourceInstanceId: resumed.sourceInstanceId } : {}),
            ...(resumed.timing !== undefined ? { timing: resumed.timing } : {}),
          },
        ]
      : [];
    const lit = [...relit, ...fresh];
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
      flyPlayedCard,
      releaseArrivalHoldsWhenIdle,
      narrate,
      enqueue,
      ...(unitGate
        ? {
            effectResults: {
              fromEventIndex: sequenced?.opened[0]?.eventIndex ?? 0,
              afterAnnounced: (step: AnimationStep) =>
                afterGate(step, unitGate, activePacing().announceMaxMs, "arrival/effectUnit"),
            },
          }
        : {}),
      ...(pendingCostClause ? { costClause: pendingCostClause } : {}),
    });
    enqueueEffectSources({
      fresh: lit,
      groupedTriggers: sequenced?.grouped.map(({ eventIndex }) => fresh[eventIndex]!) ?? [],
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
      stateVersion,
      securityGrowthClaimedRef,
      setSecurityFlights,
      launchSecurityGainFlight,
      enqueue,
    });
    // The turn seat the gauge is currently read from, before this batch passes the turn on:
    // `state.memory` is signed from the turn player's side, and the live seat has already
    // moved on whenever the same action both spends the memory and ends the turn.
    const turnSeatBeforeBatch = presentedTurnSeatRef.current;
    for (const event of fresh) {
      if (event.kind === "turnEnded") presentedTurnSeatRef.current = event.nextSeat;
      if (event.kind === "phaseChanged") presentedTurnSeatRef.current = event.turnSeat;
    }
    // A paced unit pins the complete snapshot through its announcement. A legacy gauge
    // hold from a later queued unit would replace that snapshot's earlier memory value.
    if (!unitGate)
      enqueueMemoryHold({
        fresh,
        announceGate: batchAnnounceGate,
        turnSeat: turnSeatBeforeBatch,
        memoryHoldKeyRef,
        setHeldMemory,
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
    if (sequenced) {
      for (const [index, notice] of raised.entries()) {
        const opener = sequenced.opened.find(({ eventIndex }) => eventIndex === noticeAt[index]);
        if (opener && notice.body.variant === "effect") effectSequence.bindNotice(notice, opener.unit);
      }
      for (const { unit } of sequenced.grouped) {
        const notice = effectSequence.noticeOf(unit) as MatchNotice | undefined;
        if (notice?.body.variant === "effect") notice.body = { ...notice.body, count: unit.count };
      }
      const unitDeps = {
        sequence: effectSequence,
        queue,
        batchOf,
        decisionPending: () => decisionPendingRef.current,
      };
      if (sequenced.resumed) for (const step of resumedUnitSteps(sequenced.resumed, unitDeps)) enqueue(step);
      for (const { unit } of sequenced.opened) for (const step of effectUnitSteps(unit, unitDeps)) enqueue(step);
    }
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
          ((notice.body.description?.startsWith("[Granted]") &&
            !/delet|destroy/i.test(notice.body.triggerTiming ?? "")) ||
            !deletedThisBatch.has(
              `${notice.side === "you" ? viewerSeat : otherSeat(viewerSeat)}:${notice.body.cardId}`,
            )),
      )
    )
      batchAnnounceGate.release();
    enqueueOptionDock({
      queue,
      stateVersion,
      usedOption,
      optionRouted,
      routedUnderPermanentId,
      viewerSeat,
      optionDockKeyRef,
      optionDockRef,
      decisionPendingRef,
      decisionSourceCardIdRef,
      setOptionBranch,
      flyDockedOptionUnder,
      releaseTrashArrivalsThrough,
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
    // After the notice routing, so a showcase or security cue this batch put on the centre
    // stage — and the clause it reads out — plays first.
    enqueueRevealShowcases({
      showcases: revealShowcases,
      causingEffectGate: causingEffectGateRef.current,
      setRevealShowcase,
      enqueue,
    });
    enqueueAttackAnnouncement({ announcement, setAttackAnnouncement, enqueue });
  }
  if (refusal?.kind === "actionRejected") onActionRejected(refusal.reason);
  presentSecurityAttack({
    securityAttack,
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
    stateVersion,
    revealOnStageRef,
    queuedSecurityKeyRef,
    securityDockRef,
    securityHoldRef,
    securityBlowRef,
    blowHoldState,
    setHeldBlowState,
    securityEffectHoldState,
    setHeldSecurityEffectState,
    securityClauseGateRef,
    causingEffectGateRef,
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

  if (securityReveal?.kind === "securityRevealed") {
    // Piercing can reach security after an attack declared directly on a Digimon, so there
    // may be no earlier player-attack cue to remember. Rebuild the public attacker while it
    // is still on the field; Raid normally takes the preserved path above, but benefits from
    // the same fallback if its batches were joined after a reconnect.
    if (securityAttackerRef.current?.permanentId !== securityReveal.attackerPermanentId) {
      const cardId = anchors.permanentCardId?.(securityReveal.attackerPermanentId);
      if (cardId)
        securityAttackerRef.current = {
          seat: otherSeat(securityReveal.seat),
          cardId,
          artId: securityReveal.attackerArtId,
          permanentId: securityReveal.attackerPermanentId,
          topInstanceId: cardSiteRef.current.topInstanceOf(securityReveal.attackerPermanentId),
        };
    }
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
  }
  refreshSecurityAttacker({ fresh, securityAttackerRef, setSecurityClash });
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
    // Notice routing has now enqueued this batch's effect clauses. Wait for its
    // latest announcement: the first gate may open on a preceding granted effect
    // before EX7-061's reaction names the security loss.
    causingEffectGate: unitGate ?? effectAnnounceGateRef.current ?? causingEffectGateRef.current,
    enqueue,
  });
  const optionResolving = optionDockRef.current !== null && !optionDockRef.current.closed;
  enqueueDeletionBursts({
    queue,
    fresh,
    snapshots,
    beaten,
    clashLoserIds,
    playLeadInMs,
    anchors,
    deleteBurstKeyRef,
    deletionReadyAtRef,
    deletionBurstPresentedRef,
    removalChainRef,
    securityBlowRef,
    causingEffectGate: causingEffectGateRef.current,
    costClause: costClauseRef.current,
    setDeleteBursts,
    setHeldDeletions,
    enqueue,
    stateVersion,
    causedByOption: optionResolving,
    readBeforeBreak: !sequential,
  });
  enqueueDeckReturns({
    queue,
    fresh,
    snapshots,
    anchors,
    removalChainRef,
    causingEffectGate: causingEffectGateRef.current,
    holdKeyRef: deleteBurstKeyRef,
    setHeldDeletions,
    flyCardToDeck,
    enqueue,
  });

  enqueueStackStripPeels({
    fresh,
    anchors,
    deleteBurstKeyRef,
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
    // Nor does the board a docked card held back: the next turn's board must not wait on it.
    // A dock still queued behind earlier checks keeps its clause and its board: the turn's
    // ribbons already wait for it, and reading its clause now would leave it nothing to show.
    const queuedClause = securityClauseGateRef.current?.docking === false ? securityClauseGateRef.current : null;
    if (!queuedClause) securityClauseGateRef.current?.releaseBoard();
    // No check survives its turn: anything still held has no reveal left to wait
    // for, and no close left to hand the board back. A check observed this pass still
    // owns its queued flush and its own release, so it keeps both.
    if (!securityCheck) {
      if (queuedClause)
        openHeld(
          heldNoticesRef.current.filter((notice) => !queuedClause.own.notices.includes(notice)),
          heldPanelsRef.current.filter((panel) => !queuedClause.own.panels.includes(panel)),
        );
      else flushHeldNotices();
      setPendingRevealKey(null);
    }
  }
}

/** Waiters use the announcement owner's ceiling, including a security reveal before the clause. */
function afterGate(
  step: AnimationStep,
  gate: PresentationGate,
  ceilingMs = activePacing().announceMaxMs,
  label = "sound/effectUnit",
): AnimationStep {
  return {
    ...step,
    async run(context) {
      await waitForGate(gate, context, ceilingMs, label);
      if (context.cancelled) return;
      await step.run(context);
    },
  };
}
