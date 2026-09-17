/* Everything the board plays back at the player because the server said
   something happened: sounds, info panels, the attack call-out and lunge, the
   security clash, the recovery and effect notices, the turn banner and the draw
   flights.

   The hook diffs the event log and turns each new event into steps on the
   animation queue. One cue owns one track, so a fresh cue of the same kind
   replaces its predecessor exactly as the old `clearTimeout` did, while cues of
   different kinds keep running side by side.

   Reconnect replay is the reason `cueBaselineRef` exists: the first pass over
   the log is a baseline, so a replayed history plays no sound, opens no panel,
   and enqueues its steps in `replay` mode — they set their state and clear it in
   the same beat, leaving the board in the right final state with nothing
   animating. `prefers-reduced-motion` and a hidden tab put the queue in `drain`
   mode instead, which collapses the decorative cues and leaves the ones that
   carry something to read their full time.

   The client owns no rules here: every cue is a reaction to a server event
   (ARCHITECTURE.md §4). */

import { CueTrack } from "./match/enums";
import { REDUCED_MOTION_QUERY } from "./match/environment";
import { UNSUSPEND_PHASE, UNSUSPEND_SWEEP_MS } from "./match/constants";
import { OPTION_DOCK_TRACKS, holdsTheBoard } from "./match/tracks";
import { liveMode } from "./match/environment";
import { withoutId } from "./match/eventLookup";
import { buildCardSiteIndex } from "./match/cardSiteIndex";
import { batchFacts } from "./match/present/batchFacts";
import { combatScenes } from "./match/present/combat";
import { collectBatchAnnouncements } from "./match/present/announcements";
import { enqueueArrivals } from "./match/present/arrivals";
import { enqueueAttackAnnouncement } from "./match/present/attackAnnouncement";
import { presentSecurityAttack } from "./match/present/attackLunge";
import { enqueueCombatImpact } from "./match/present/combatImpact";
import { enqueueDeletionBursts } from "./match/present/deletionBursts";
import { enqueueSecurityDestructions } from "./match/present/securityDestructions";
import { enqueueOptionDock } from "./match/present/optionDock";
import { routeBatchNotices } from "./match/present/noticeRouting";
import { enqueueBatchSounds } from "./match/present/sounds";
import { enqueueDeckRiffles } from "./match/present/deckRiffles";
import { enqueueEffectSources } from "./match/present/effectSources";
import { enqueueSecurityGrowth } from "./match/present/securityGrowth";
import { securityRevealScene } from "./match/present/securityRevealScene";
import { presentSecurityClose } from "./match/present/securityClose";
import { presentSecurityRevealed } from "./match/present/securityReveal";
import { securityHold } from "./match/securityHold";
import { cueFlights } from "./match/flights";
import { narrationStream } from "./match/narration/narrationStream";
import { Side } from "./side";
import type {
  AttackLunge,
  DeleteBurst,
  DrawBurst,
  DrawFlight,
  MatchCueAnchors,
  MatchCues,
  RevealOnStage,
  SecurityBreakCue,
  TurnTransitionCue,
  UnsuspendSweep,
} from "./match/types";

export type {
  AttackLunge,
  DeleteBurst,
  DrawBurst,
  DrawFlight,
  MatchCueAnchors,
  MatchCues,
  SecurityBreakCue,
  TurnTransitionCue,
  UnsuspendSweep,
} from "./match/types";
export { CueTrack, LungeDirection, SecurityBreakPhase } from "./match/enums";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { snapshotGameState, type StateSnapshot } from "../net/presentedState";
import { type GameState, type Seat, type ServerEvent, type PresentationReport } from "@aegis/shared";
import { playSound, type SoundKind } from "../design/sound";
import { buildInstanceIndex, otherSeat } from "./boardModel";
import { batchesAfter, type ServerBatch } from "../net/serverBatches";
import { shouldPlayCue, type CueTimestamps } from "./soundEvents";
import {
  buildInstanceSeatIndex,
  buildInstanceArtIndex,
  type AttackAnnouncement,
  type SidePanel,
  type SidePanelLookup,
} from "./sidePanels";
import { isOwnEffectNotice, noticeRemaining, rejectionNotice, securityGainNotice, type MatchNotice } from "./notices";
import { narrationReadingTime, trimNarration, COLLAPSED_NARRATION_LIMIT, type NarrationItem } from "./narration";
import {
  securityCheckSegments,
  type SecurityBranchScene,
  type SecurityClashAttacker,
  type SecurityClashScene,
} from "./securityClash";
import { hasTurnStartDraw, type PermanentBurst, type ZoneShowcase } from "./showcases";
import { createAnimationQueue, type AnimationStep, type AnimationStepContext } from "./animationQueue";
import { createPresentationProgress, PRESENTED_BOARD_BUDGET_MS } from "./presentationProgress";
import { presentationTelemetry } from "./presentationTelemetry";
import { type EffectActivation, type EffectSourceLookup } from "./effectSource";
import { type FieldClashScene, type OpenAttack } from "./fieldClash";
import { isAnnouncedPhase, phaseBannerFrom, type PhaseBanner } from "./phaseBanner";
import { dpPulses as diffDpPulses, type DpPulse } from "./dpPulse";
import { freezePulses as diffFreezePulses, type FreezeFlags, type FreezePulse } from "./freezePulse";
import { DECISION_STALL_BUDGET_MS, dpPulseTotalMs, PLAY_LEAD_IN_BUDGET_MS, TIMINGS } from "./timings";

export function useMatchCues({
  batches,
  phaseEvents,
  state,
  snapshots,
  viewerSeat,
  mulliganOpen,
  decisionPending = false,
  collapseNarration = false,
  narrationLimit = 2,
  decisionStateVersion,
  anchors,
  onActionRejected,
  onPresentationReport,
}: {
  /** The closed server batches, in order. One batch is one moment of the rules. */
  batches: readonly ServerBatch[];
  /** Raw phase events arrive before the state patch and its batch-close marker. */
  phaseEvents?: readonly ServerEvent[];
  state: GameState | undefined;
  snapshots?: readonly StateSnapshot[];
  viewerSeat: Seat;
  /** The opening hand and a mulligan redeal are dealt, not drawn. */
  mulliganOpen: boolean;
  /**
   * The server is waiting on an answer from the viewer. A check the server stopped
   * mid-resolution to ask something can only be closed once that answer is given, so the
   * question is what releases a presentation still holding the screen (see below).
   */
  decisionPending?: boolean;
  /** The portrait phone folds both narration columns into one centred slot. */
  collapseNarration?: boolean;
  /**
   * How many moments one column holds. Two, so a clause is not displaced the moment the
   * other player raises one — the columns are shared by both players now. The phone's
   * folded slot keeps one, because there is only room to read one thing at a time there.
   */
  narrationLimit?: number;
  /**
   * The revision the viewer's open decision was raised at (`DecisionRequest.stateVersion`).
   * The barrier fast-forwards the queue up to it before the prompt is shown, so the board
   * the viewer answers over is the board the question was asked about.
   */
  decisionStateVersion?: number;
  anchors: MatchCueAnchors;
  onActionRejected: (reason: string) => void;
  onPresentationReport?: (report: PresentationReport) => void;
}): MatchCues {
  // How far the presentation has got, in server revisions. Every step is counted into the
  // batch it was enqueued for, so the board can be rendered from the snapshot of the batch
  // the queue is actually presenting instead of from whatever the server has since resolved.
  const [presentedStateVersion, setPresentedStateVersion] = useState<number | undefined>(undefined);
  const publishPresentedRef = useRef<() => void>(() => {});
  const progress = useMemo(
    () => createPresentationProgress(() => publishPresentedRef.current(), presentationTelemetry),
    [],
  );
  const [decisionAnimationsPending, setDecisionAnimationsPending] = useState(false);
  // Every queue change bumps this. Nothing reads what it counts — it is the proof that the
  // queue is still moving, which is what the decision stall watchdog waits on.
  const [queueActivity, setQueueActivity] = useState(0);
  // The watchdog fired: the queue stopped moving while the viewer had a question to answer,
  // so the prompt is handed over whatever the queue still claims to owe.
  const [decisionStalled, setDecisionStalled] = useState(false);
  const queueChangedRef = useRef<() => void>(() => {});
  const visiblePhaseBannerRef = useRef(false);
  // A cue belongs after its preceding phase announcement, not merely after whichever
  // ribbon happens to be visible when its batch arrives. Phase prerequisites exclude
  // future cues so a later attack cannot hold back the very phase it is waiting for.
  const completedPhaseOrderRef = useRef(0);
  const nextPhaseOrderRef = useRef(0);
  const phaseOrdersRef = useRef(new Map<ServerEvent, number>());
  const enqueuePhaseOrderRef = useRef<number | undefined>(undefined);
  const stepPhaseOrdersRef = useRef(new WeakMap<AnimationStep, number>());
  const narrationPhaseOrdersRef = useRef(new Map<string, number>());
  const eventTimeline = phaseEvents ?? batches.flatMap((batch) => batch.events);
  const phaseStateRef = useRef({ events: eventTimeline, snapshots });
  phaseStateRef.current = { events: eventTimeline, snapshots };
  function phaseOrderFor(events: readonly ServerEvent[]): number {
    const first = events[0];
    let order = completedPhaseOrderRef.current;
    // Fabricated previews may provide raw, unsequenced phase events separately
    // from cloned batch events. Use batch order there, matching phase identities.
    const timeline = phaseEvents?.some((event) => !("seq" in event))
      ? batches.flatMap((batch) => batch.events)
      : eventTimeline;
    for (const event of timeline) {
      const phaseOrder =
        phaseOrdersRef.current.get(event) ??
        [...phaseOrdersRef.current].find(([phase]) =>
          phase.kind === "phaseChanged" && event.kind === "phaseChanged"
            ? phase.phase === event.phase && phase.turnSeat === event.turnSeat && phase.turnCount === event.turnCount
            : phase.kind === "turnEnded" &&
              event.kind === "turnEnded" &&
              phase.turnCount === event.turnCount &&
              phase.endingSeat === event.endingSeat,
        )?.[1];
      order = phaseOrder ?? order;
      if (
        event === first ||
        (first &&
          "seq" in first &&
          "batch" in first &&
          "seq" in event &&
          "batch" in event &&
          first.seq === event.seq &&
          first.batch === event.batch)
      )
        return order;
    }
    return completedPhaseOrderRef.current;
  }
  const presentationReporterRef = useRef(onPresentationReport);
  presentationReporterRef.current = onPresentationReport;
  const presentationBatchRef = useRef<{ batchId: string; stateVersion: number } | undefined>(undefined);
  const batchVersionsRef = useRef(new Map<string, number>());
  const heldOriginsRef = useRef(new WeakMap<object, { batchId: string; stateVersion: number; phaseOrder: number }>());
  const stepBatchesRef = useRef(new WeakMap<AnimationStep, { batchId: string; stateVersion: number }>());
  const queue = useMemo(() => {
    const inner = createAnimationQueue({
      mode: liveMode(),
      onChange: () => queueChangedRef.current(),
      onError: (error, step) => console.error("[MATCH_CUE] step failed", { step: step.id, error }),
      onStep: ({ step, ...event }) => {
        if (event.mode === "replay") return;
        try {
          presentationReporterRef.current?.({
            ...event,
            ...(step.origin ?? stepBatchesRef.current.get(step)),
            ...(step.side ? { side: step.side } : {}),
            stepId: step.id,
            track: step.track ?? "main",
            clientTimestamp: Date.now(),
            pendingCount: inner.pendingCount(),
          });
        } catch {
          // Diagnostic transport must never interrupt the presentation.
        }
      },
    });
    const counted = (step: AnimationStep): AnimationStep => {
      const phaseOrder = step.origin?.phaseOrder ?? enqueuePhaseOrderRef.current ?? completedPhaseOrderRef.current;
      const gated =
        step.track === "phaseBanner" || step.track === "unsuspendSweep" || step.track?.startsWith("turnDrawFlight-")
          ? step
          : {
              ...step,
              async run(context: AnimationStepContext) {
                // Later server batches may arrive while a ribbon is still on screen.
                // Keep their visual cues behind that ribbon, preserving its full duration.
                while (
                  (visiblePhaseBannerRef.current || completedPhaseOrderRef.current < phaseOrder) &&
                  !context.cancelled &&
                  !context.skipping &&
                  context.mode === "live"
                ) {
                  await context.wait(16);
                }
                await step.run(context);
              },
            };
      // A replayed or drained step presents no moment of its own: reconnect history and a
      // screen with no animation to watch both render the live board (presentedState.ts).
      const countedStep =
        inner.getMode() !== "live" || step.mode === "replay" || !holdsTheBoard(step) ? gated : progress.track(gated);
      stepPhaseOrdersRef.current.set(countedStep, phaseOrder);
      if (presentationBatchRef.current) stepBatchesRef.current.set(countedStep, presentationBatchRef.current);
      return countedStep;
    };
    return {
      ...inner,
      enqueue(step: AnimationStep | readonly AnimationStep[]) {
        inner.enqueue(Array.isArray(step) ? step.map(counted) : counted(step as AnimationStep));
        // An idle queue is the proof that nothing is left to present, whatever became of
        // the steps — a track replaced before a step ever started runs no `finally`.
        void inner.idle().then(() => progress.settle());
      },
    };
  }, [progress]);
  // Every finite cue is a prerequisite for a new choice. The security dock and the
  // battle hold are deliberately excluded: both wait for the answer itself and would
  // deadlock. Toast reading happens outside the queue, so it never delays a decision.
  queueChangedRef.current = () => {
    setDecisionAnimationsPending(
      queue.hasPendingStep(
        (step) =>
          step.track !== CueTrack.SecurityDock && step.track !== CueTrack.SecurityHold && step.blocksDecision !== false,
      ),
    );
    setQueueActivity((count) => count + 1);
  };
  // Assigned on every render so the queue's bookkeeping always reaches the current setter.
  publishPresentedRef.current = () => setPresentedStateVersion(progress.current());

  const [narration, setNarration] = useState<ReadonlyMap<string, NarrationItem>>(new Map());
  const [rejection, setRejection] = useState<MatchNotice | null>(null);
  const narrationRef = useRef(narration);
  narrationRef.current = narration;
  const [attackAnnouncement, setAttackAnnouncement] = useState<AttackAnnouncement | null>(null);
  const [turnTransition, setTurnTransition] = useState<TurnTransitionCue | null>(null);
  const [securityClash, setSecurityClash] = useState<SecurityClashScene | null>(null);
  const [securityBreak, setSecurityBreak] = useState<SecurityBreakCue | null>(null);
  // Security cards a scene is still holding: the board has already dropped each one, and
  // the scene that shows it leaving has not reached that beat yet. Keyed by scene so a
  // cancelled scene releases exactly its own card and never a newer scene's.
  //
  // Phase 3 kept this hold. The presented snapshot lags by BATCH, and a check removes the
  // card and reveals it inside one batch, so the snapshot cannot hold the figure through
  // the reveal — only this can.
  const [heldSecurityCards, setHeldSecurityCards] = useState<ReadonlyMap<number, { seat: Seat; count: number }>>(
    new Map(),
  );
  const [securityBranch, setSecurityBranch] = useState<SecurityBranchScene | null>(null);
  const [optionBranch, setOptionBranch] = useState<SecurityBranchScene | null>(null);
  // The check whose reveal the screen still owes the viewer, by clash key.
  const [pendingRevealKey, setPendingRevealKey] = useState<number | null>(null);
  // The revision the viewer's prompt is waiting for the presentation to reach. Null
  // whenever no prompt is waiting (docs/presentation-queue-plan.md 3.2).
  const [decisionBarrier, setDecisionBarrier] = useState<number | null>(null);
  const [unsuspendSweep, setUnsuspendSweep] = useState<UnsuspendSweep | null>(null);
  const [deleteBursts, setDeleteBursts] = useState<readonly DeleteBurst[]>([]);
  const [attackLunge, setAttackLunge] = useState<AttackLunge | null>(null);
  const [securityHitSeat, setSecurityHitSeat] = useState<number | null>(null);
  const [drawFlights, setDrawFlights] = useState<readonly DrawFlight[]>([]);
  const [drawBursts, setDrawBursts] = useState<readonly DrawBurst[]>([]);
  const [zoneShowcase, setZoneShowcase] = useState<ZoneShowcase | null>(null);
  const [permanentBursts, setPermanentBursts] = useState<ReadonlyMap<string, PermanentBurst>>(new Map());
  const [pendingPermanentIds, setPendingPermanentIds] = useState<ReadonlySet<string>>(new Set());
  const [phaseBanner, setPhaseBanner] = useState<PhaseBanner | null>(null);
  const [pendingPhaseBanners, setPendingPhaseBanners] = useState(0);
  const [heldDrawState, setHeldDrawState] = useState<{ seat: Seat; state: GameState } | undefined>();
  const [heldPhaseState, setHeldPhaseState] = useState<GameState | undefined>();
  const [heldBreedingState, setHeldBreedingState] = useState<MatchCues["heldBreedingState"]>();
  const [announcedPhase, setAnnouncedPhase] = useState(state?.phase);
  const [announcedTurn, setAnnouncedTurn] = useState<{ seat: Seat; count: number } | undefined>(
    state && { seat: state.turnSeat, count: state.turnCount },
  );
  const [heldSuspendedIds, setHeldSuspendedIds] = useState<ReadonlySet<string>>(new Set());
  const previousDrawStateRef = useRef<GameState | undefined>(undefined);
  const phaseBaselineRef = useRef(false);
  const lastPhaseEventRef = useRef<Extract<ServerEvent, { kind: "phaseChanged" | "turnEnded" }> | undefined>(undefined);
  /** The seat whose turn-start draw is held back, or null while nothing is held. */
  const drawPhaseWaitingRef = useRef<Seat | null>(null);
  const [combatImpactIds, setCombatImpactIds] = useState<ReadonlySet<string>>(new Set());
  const [fieldClash, setFieldClash] = useState<FieldClashScene | null>(null);
  const [dpPulses, setDpPulses] = useState<ReadonlyMap<string, DpPulse>>(new Map());
  const [freezePulses, setFreezePulses] = useState<ReadonlyMap<string, FreezePulse>>(new Map());
  const [effectSources, setEffectSources] = useState<readonly EffectActivation[]>([]);
  const [deckRiffles, setDeckRiffles] = useState<ReadonlySet<string>>(new Set());
  const [securityFlights, setSecurityFlights] = useState<ReadonlySet<number>>(new Set());
  const [securityDealCounts, setSecurityDealCounts] = useState<ReadonlyMap<Seat, number>>(new Map());

  // Cues are observed twice for your own actions (the intent handler fires one
  // immediately, the server echo arrives later), so repeats are suppressed.
  const cuePlayedAtRef = useRef<CueTimestamps>({});
  const cueBaselineRef = useRef(false);
  /** The last batch already presented, so a re-render presents nothing twice. */
  const lastCueBatchRef = useRef<string | undefined>(undefined);
  /** Deletions already queued, spanning adjacent server batches. */
  const deletionBurstPresentedRef = useRef(new Set<string>());
  const noticeSequenceRef = useRef(0);
  const sidePanelSequenceRef = useRef(0);
  const narrationSequenceRef = useRef(0);
  /**
   * The batch most recently presented. A notice a check held back is raised by a later
   * cue, so the item it becomes is stamped with the batch the screen has reached rather
   * than with a boundary it has already left behind.
   */
  const lastBatchIdRef = useRef("");
  /** The advance each presenting slot is waiting on, so a tap moves it on. */
  const narrationLimitRef = useRef(narrationLimit);
  narrationLimitRef.current = narrationLimit;
  const collapseNarrationRef = useRef(collapseNarration);
  collapseNarrationRef.current = collapseNarration;
  /** Set by an explicit skip: every item still queued is collapsed rather than read. */
  const narrationSkipRef = useRef(false);
  // Read inside a running step, so they follow the live props rather than the ones the
  // step was enqueued under.
  const decisionPendingRef = useRef(decisionPending);
  decisionPendingRef.current = decisionPending;
  /** Cards whose own decision dialog is open, so their clause is not read out twice. */
  const suppressedOwnEffectsRef = useRef(new Set<string>());
  // A security card that resolves an effect moves its notice out of the panels'
  // half of the screen; the flag is set by the check and spent by the effect.
  const securityEffectPendingRef = useRef(false);
  // Notices a check handed to its centre-stage sequence and that the sequence has not
  // read out yet. A newer check replaces that track, so they are flushed rather than
  // dropped with it — a lost animation is a shrug, a lost effect description is not.
  const heldNoticesRef = useRef<readonly MatchNotice[]>([]);
  // The side panels those same notices belong with. A revealed-cards panel is the other
  // half of what an effect did, so it waits on exactly the cue the notice waits on —
  // otherwise the panel prints an [On Play] result beside a card still mid-reveal.
  const heldPanelsRef = useRef<readonly SidePanel[]>([]);
  const revealOnStageRef = useRef<RevealOnStage | null>(null);
  // The dock the centre-stage track is currently holding open, if any. The dock step polls
  // it: the check closing (or a newer reveal claiming the key) is what lets the card go.
  const securityDockRef = useRef<{ key: number; closed: boolean } | null>(null);
  // The battle hold the centre of the screen is currently keeping open, if any. Polled the
  // same way the dock is: the check closing is what releases the card into its outcome beat.
  const securityHoldRef = useRef<{ key: number; closed: boolean } | null>(null);
  // A used Option has the same open-ended lifetime as a docked Security card: it starts
  // at cardPlayed and closes only when the server confirms its post-resolution routing.
  const optionDockRef = useRef<{ key: number; closed: boolean } | null>(null);
  // `cardsMoved` names only instance ids, so the panels need the board's current
  // identity and ownership index to name the cards that just moved.
  const sidePanelLookupRef = useRef<SidePanelLookup>({ cardId: () => undefined, seat: () => undefined });
  // The card the checked player is defending against. A security check carries no
  // attacker, so it is remembered from the attack that opened the check.
  const lastVisibleArtRef = useRef(new Map<string, string>());
  const securityAttackerRef = useRef<SecurityClashAttacker | undefined>(undefined);
  const securityClashKeyRef = useRef(0);
  const queuedSecurityKeyRef = useRef<number | null>(null);
  // The attack still open on the board, so the battle that closes it can be staged
  // even when its declaration and its resolution arrive in the same batch.
  const openAttackRef = useRef<OpenAttack | null>(null);
  const fieldClashKeyRef = useRef(0);
  const drawFlightKeyRef = useRef(0);
  const deleteBurstKeyRef = useRef(0);
  const unsuspendSweepKeyRef = useRef(0);
  const showcaseKeyRef = useRef(0);
  const phaseBannerKeyRef = useRef(0);
  const dpPulseKeyRef = useRef(0);
  const freezePulseKeyRef = useRef(0);
  const effectSourceKeyRef = useRef(0);
  const optionDockKeyRef = useRef(0);
  const deletionReadyAtRef = useRef(new Map<string, { readyAt: number; instanceId?: string }>());
  const deckRiffleKeyRef = useRef(0);
  // Where every card the viewer can see currently sits, so an activation can be
  // played at its source and a reshuffle at the pile it landed in.
  const cardSiteRef = useRef<{
    locate: EffectSourceLookup;
    seatOf: (instanceId: string) => Seat | undefined;
    topInstanceOf: (permanentId: string) => string | undefined;
  }>({
    locate: () => undefined,
    seatOf: () => undefined,
    topInstanceOf: () => undefined,
  });
  // Last read of every permanent's live DP, so the next commit can tell which
  // figures actually moved. The first read is only a baseline.
  const dpByPermanentRef = useRef<Map<string, number> | null>(null);
  // The same baseline discipline for the projected attack/block restrictions.
  const restrictionsByPermanentRef = useRef<Map<string, FreezeFlags> | null>(null);
  const handCountsRef = useRef<{ you: number; opp: number } | null>(null);
  // Last read of each seat's security count, so a stack an effect grew can be told
  // from one an event already narrated — a recovery or an effect's add owns its own flight and notice.
  const securityCountsRef = useRef<{ you: number; opp: number } | null>(null);
  const securityGrowthClaimedRef = useRef<Set<Seat>>(new Set());
  const securityGainKeyRef = useRef(0);
  // The opening stack is dealt once. Security seen before that — a reconnection into a
  // match already under way — retires the deal rather than playing it late.
  const openingSecurityDealRef = useRef<"pending" | "done">("pending");
  // Destruction scenes enqueued and not yet finished. A chained effect (Medusamon's
  // Petrification tokens) trashes one security card per resolution step, so each trash
  // arrives in its own batch — and each batch's first shield break must NOT take the
  // centre of the screen off the previous card's still-playing scene.
  const pendingDestructionsRef = useRef(0);
  // Set when the draw phase is announced and spent by the hand that grows in the
  // same commit, which is what tells a turn-start draw from an effect draw.
  const turnStartDrawRef = useRef({ you: false, opp: false });
  const eventDrawCountsRef = useRef<{ you?: number; opp?: number }>({});
  const pendingDigivolutionDrawRef = useRef(new Set<Seat>());

  const playCue = (kind: SoundKind) => {
    const now = Date.now();
    if (!shouldPlayCue(kind, now, cuePlayedAtRef.current)) return;
    cuePlayedAtRef.current[kind] = now;
    playSound(kind);
  };

  // Reduced motion and a hidden tab both mean "no animation to watch": collapse
  // the decorative waits and leave the readable ones alone.
  useEffect(() => {
    const sync = () => queue.setMode(liveMode());
    sync();
    const query = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : undefined;
    query?.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      query?.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [queue]);

  useEffect(() => () => queue.clear(), [queue]);

  // Declared before the event effect below so the same commit refreshes the
  // index first: a card is already in its new zone when its movement is narrated.
  useLayoutEffect(() => {
    if (!state) return;
    const cardIds = buildInstanceIndex(state, viewerSeat);
    const seats = buildInstanceSeatIndex(state);
    const arts = buildInstanceArtIndex(state);
    for (const [id, artId] of arts) lastVisibleArtRef.current.set(id, artId);
    sidePanelLookupRef.current = {
      artId: (id) => arts.get(id),
      cardId: (id) => cardIds.get(id),
      seat: (id) => seats.get(id),
    };
    cardSiteRef.current = buildCardSiteIndex(state);
  });

  const { securityCountOf, holdSecurityCard, releaseSecurityCardWhenIdle, releaseSecurityCard } = securityHold({
    queue,
    state,
    setHeldSecurityCards,
  });

  /**
   * The highest figure any scene is still holding for each seat, which is what the shield
   * shows. Several scenes hold at once when one effect spends a run of cards: each holds
   * the figure its own card is the last of, so the max is always the card on stage now.
   */
  const heldSecurityCounts = useMemo(() => {
    const highest = new Map<Seat, number>();
    for (const { seat, count } of heldSecurityCards.values()) {
      highest.set(seat, Math.max(highest.get(seat) ?? 0, count));
    }
    return highest;
  }, [heldSecurityCards]);

  const effectNarrationTracksRef = useRef(new Map<Seat, string>());

  const { narrate, flushHeldNotices, openHeld, narrationBefore } = narrationStream({
    viewerSeat,
    queue,
    cardSiteRef,
    effectNarrationTracksRef,
    heldOriginsRef,
    enqueuePhaseOrderRef,
    batchVersionsRef,
    narrationPhaseOrdersRef,
    completedPhaseOrderRef,
    presentationReporterRef,
    narrationSkipRef,
    deletionReadyAtRef,
    effectSourceKeyRef,
    setEffectSources,
    setNarration,
    collapseNarrationRef,
    narrationLimitRef,
    suppressedOwnEffectsRef,
    heldNoticesRef,
    heldPanelsRef,
    lastBatchIdRef,
    narrationSequenceRef,
    narrationRef,
  });
  useEffect(() => {
    if (narration.size === 0) return;
    const expiresAt = Math.min(...[...narration.values()].map((item) => item.createdAt + narrationReadingTime(item)));
    const timer = setTimeout(
      () => {
        const now = Date.now();
        setNarration((items) => {
          const kept = new Map([...items].filter(([, item]) => item.createdAt + narrationReadingTime(item) > now));
          for (const id of narrationPhaseOrdersRef.current.keys())
            if (!kept.has(id)) narrationPhaseOrdersRef.current.delete(id);
          return kept;
        });
      },
      Math.max(0, expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [narration]);

  // A tightened cap has to be applied to what is already on screen, per column: trimming
  // the map as one list would drop a clause because the other column happened to be full.
  useEffect(() => {
    setNarration((items) =>
      trimNarration(
        items,
        collapseNarrationRef.current ? COLLAPSED_NARRATION_LIMIT : narrationLimit,
        collapseNarrationRef.current,
      ),
    );
  }, [narrationLimit]);

  /**
   * Present one server batch: everything the rules resolved in one entry into the engine.
   *
   * The batch is the unit every heuristic below reasons about — the combat lead-in, the
   * pairing of a security reveal with its close, what a check played and what that card then
   * did. It used to be "the events that arrived since the last render", which made the
   * boundary the patch tick; it is now the boundary the server drew.
   */
  function presentBatch(
    batchId: string,
    stateVersion: number,
    fresh: readonly ServerEvent[],
    replayingHistory: boolean,
    continuingBatch = false,
  ) {
    const phaseSegments: ServerEvent[][] = [];
    for (const event of fresh) {
      if (phaseSegments.length === 0 || event.kind === "phaseChanged" || event.kind === "turnEnded")
        phaseSegments.push([]);
      phaseSegments.at(-1)!.push(event);
    }
    const segments = phaseSegments.flatMap(securityCheckSegments);
    if (segments.length > 1) {
      for (const [index, segment] of segments.entries()) {
        presentBatch(batchId, stateVersion, segment, replayingHistory, continuingBatch || index > 0);
      }
      return;
    }
    enqueuePhaseOrderRef.current = phaseOrderFor(fresh);
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
      const showcasePlays = queue.getMode() === "live";
      const { announcement, opened, raised, panelAt, noticeAt } = collectBatchAnnouncements({
        fresh,
        viewerSeat,
        state,
        now,
        showcasePlays,
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
      fresh,
      beaten,
      clashLoserIds,
      playLeadInMs,
      anchors,
      deleteBurstKeyRef,
      deletionReadyAtRef,
      deletionBurstPresentedRef,
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

  const phaseBatchesRef = useRef(batches);
  phaseBatchesRef.current = batches;

  async function waitForPhasePrerequisites(
    context: AnimationStepContext,
    arrivals: readonly ServerEvent[],
    phaseOrder: number,
  ) {
    // Batch presentation registers its cues in the following layout effect.
    await Promise.resolve();
    const batchDeadline = Date.now() + PRESENTED_BOARD_BUDGET_MS;
    while (!context.cancelled && !context.skipping && context.mode === "live") {
      const awaitingBatch =
        Date.now() < batchDeadline &&
        arrivals.some(
          (event) =>
            !phaseBatchesRef.current.some((batch) =>
              batch.events.some(
                (candidate) =>
                  candidate === event ||
                  ("seq" in event &&
                    "batch" in event &&
                    candidate.seq === event.seq &&
                    candidate.batch === event.batch) ||
                  (!("seq" in event) &&
                    (event.kind === "cardPlayed" ||
                      event.kind === "digivolved" ||
                      event.kind === "hatched" ||
                      event.kind === "movedFromBreeding" ||
                      event.kind === "cardsMoved") &&
                    candidate.kind === event.kind &&
                    (event.kind === "cardsMoved" && candidate.kind === "cardsMoved"
                      ? candidate.instanceIds.join(",") === event.instanceIds.join(",")
                      : candidate.kind !== "cardsMoved" &&
                        event.kind !== "cardsMoved" &&
                        candidate.permanentId === event.permanentId)),
              ),
            ),
        );
      const awaitingCue = queue.hasPendingStep(
        (step) =>
          step.track !== "phaseBanner" &&
          step.track !== CueTrack.SecurityDock &&
          !OPTION_DOCK_TRACKS.includes(step.track ?? "") &&
          (stepPhaseOrdersRef.current.get(step) ?? 0) < phaseOrder,
      );
      // A clause the ribbon is about to cover gets one readable beat first. The same budget
      // bounds it: a batch that keeps arriving must never hold the ribbon for good.
      const awaitingRead =
        Date.now() < batchDeadline &&
        narrationBefore(phaseOrder).some((item) => Date.now() - item.createdAt < TIMINGS.phaseBannerNoticeRead);
      if (!awaitingBatch && !awaitingCue && !awaitingRead) return;
      await context.wait(16);
    }
  }

  const phaseHistory = useMemo(
    () =>
      (phaseEvents ?? batches.flatMap((batch) => batch.events)).filter(
        (event) => event.kind === "phaseChanged" || event.kind === "turnEnded",
      ),
    [phaseEvents, batches],
  );
  // Establish the old hand/rotation before paint when a patch and its phases arrive together.
  useLayoutEffect(() => {
    for (const [event, order] of phaseOrdersRef.current) {
      if (order <= completedPhaseOrderRef.current && !phaseHistory.includes(event as (typeof phaseHistory)[number])) {
        phaseOrdersRef.current.delete(event);
      }
    }
    const last = lastPhaseEventRef.current;
    lastPhaseEventRef.current = phaseHistory.at(-1);
    if (!phaseBaselineRef.current) {
      phaseBaselineRef.current = true;
      return;
    }
    const fresh = phaseHistory.slice(last ? phaseHistory.lastIndexOf(last) + 1 : 0);
    for (const openedPhase of fresh) {
      if (openedPhase.kind === "phaseChanged" && !isAnnouncedPhase(openedPhase.phase)) continue;
      const phaseOrder = ++nextPhaseOrderRef.current;
      phaseOrdersRef.current.set(openedPhase, phaseOrder);
      const arrivals = eventTimeline
        .slice(last ? eventTimeline.lastIndexOf(last) + 1 : 0, eventTimeline.indexOf(openedPhase))
        .filter(
          (event) =>
            event.kind === "cardPlayed" ||
            event.kind === "digivolved" ||
            event.kind === "hatched" ||
            event.kind === "movedFromBreeding" ||
            event.kind === "cardsMoved",
        );
      if (openedPhase.kind === "turnEnded") {
        const transition: TurnTransitionCue = {
          endingSeat: openedPhase.endingSeat,
          nextSeat: openedPhase.nextSeat,
          turnCount: openedPhase.turnCount,
        };
        setPendingPhaseBanners((count) => count + 1);
        queue.enqueue({
          id: `turn-banner-${transition.turnCount}`,
          side: openedPhase.nextSeat === viewerSeat ? Side.Viewer : Side.Opponent,
          track: "phaseBanner",
          async run(context) {
            try {
              await waitForPhasePrerequisites(context, arrivals, phaseOrder);
              if (context.cancelled || context.mode !== "live") return;
              visiblePhaseBannerRef.current = true;
              // The count belongs to the turn that just ended; the new one arrives with the
              // phase ribbons that follow, which carry it.
              setAnnouncedTurn((current) => ({
                seat: openedPhase.nextSeat,
                count: current?.count ?? openedPhase.turnCount,
              }));
              playCue("turnChange");
              setTurnTransition(transition);
              await context.wait(TIMINGS.turnBanner);
              setTurnTransition((current) => (current === transition ? null : current));
              await context.wait(TIMINGS.phaseBannerGap);
            } finally {
              visiblePhaseBannerRef.current = false;
              completedPhaseOrderRef.current = phaseOrder;
              setTurnTransition((current) => (current === transition ? null : current));
              setPendingPhaseBanners((count) => count - 1);
            }
          },
        });
        continue;
      }
      if (openedPhase.kind !== "phaseChanged") continue;
      phaseBannerKeyRef.current += 1;
      const banner = phaseBannerFrom({
        phase: openedPhase.phase,
        turnSeat: openedPhase.turnSeat,
        viewerSeat,
        key: phaseBannerKeyRef.current,
      });
      if (banner) {
        setPendingPhaseBanners((count) => count + 1);
        if (banner.phase === UNSUSPEND_PHASE) {
          drawPhaseWaitingRef.current = openedPhase.turnSeat;
          const drawState = previousDrawStateRef.current;
          setHeldDrawState(drawState && { seat: openedPhase.turnSeat, state: drawState });
          setHeldPhaseState(previousDrawStateRef.current);
          const player = previousDrawStateRef.current?.players[openedPhase.turnSeat];
          if (player) setHeldBreedingState({ seat: openedPhase.turnSeat, player });
          setHeldSuspendedIds(
            new Set(
              previousDrawStateRef.current?.players[openedPhase.turnSeat]?.battleArea
                .filter((permanent) => permanent.isSuspended)
                .map((permanent) => permanent.permanentId) ?? [],
            ),
          );
        }
        queue.enqueue({
          id: `phase-banner-${banner.key}`,
          side: banner.side,
          track: "phaseBanner",
          async run(context) {
            try {
              if (context.mode !== "live") {
                setHeldSuspendedIds(new Set());
                setHeldPhaseState(undefined);
                setHeldBreedingState(undefined);
                drawPhaseWaitingRef.current = null;
                setHeldDrawState(undefined);
                return;
              }
              await waitForPhasePrerequisites(context, arrivals, phaseOrder);
              if (context.cancelled || context.mode !== "live") return;
              visiblePhaseBannerRef.current = true;
              if (isAnnouncedPhase(openedPhase.phase)) setAnnouncedPhase(openedPhase.phase);
              setAnnouncedTurn({ seat: openedPhase.turnSeat, count: openedPhase.turnCount });
              setPhaseBanner(banner);
              if (banner.phase === UNSUSPEND_PHASE) {
                setHeldSuspendedIds(new Set());
                const timeline = phaseStateRef.current.events;
                const activeIndex = timeline.indexOf(openedPhase);
                const afterActive = timeline.slice(activeIndex + 1);
                const nextPhaseIndex = afterActive.findIndex((event) => event.kind === "phaseChanged");
                const unsuspendedIds = new Set(
                  afterActive
                    .slice(0, nextPhaseIndex < 0 ? undefined : nextPhaseIndex)
                    .flatMap((event) =>
                      event.kind === "cardsMoved" && event.from === "suspended" && event.to === "unsuspended"
                        ? event.instanceIds
                        : [],
                    ),
                );
                setHeldPhaseState((held) =>
                  held
                    ? ({
                        ...held,
                        players: held.players.map((player, seat) =>
                          seat === openedPhase.turnSeat
                            ? {
                                ...player,
                                battleArea: player.battleArea.map((permanent) => ({
                                  ...permanent,
                                  isSuspended: unsuspendedIds.has(permanent.permanentId)
                                    ? false
                                    : permanent.isSuspended,
                                })),
                              }
                            : player,
                        ),
                      } as GameState)
                    : held,
                );
                const sweep: UnsuspendSweep = { seat: openedPhase.turnSeat, key: ++unsuspendSweepKeyRef.current };
                queue.enqueue({
                  id: `unsuspend-sweep-${sweep.key}`,
                  track: "unsuspendSweep",
                  replace: true,
                  async run(sweepContext) {
                    if (sweepContext.mode !== "live") return;
                    try {
                      setUnsuspendSweep(sweep);
                      await sweepContext.wait(UNSUSPEND_SWEEP_MS);
                    } finally {
                      setUnsuspendSweep((current) => (current?.key === sweep.key ? null : current));
                    }
                  },
                });
              }
              // The first turn can skip drawing; breeding also releases the hold.
              if (banner.phase === "Draw" || banner.phase === "Breeding" || banner.phase === "Main") {
                drawPhaseWaitingRef.current = null;
                setHeldDrawState(undefined);
              }
              await context.wait(TIMINGS.phaseBanner);
              if (banner.phase === "Breeding") {
                // A fast bot may already have evolved in Main. Present the raising
                // area at the Main boundary first, so its hatch remains visible.
                const main = phaseStateRef.current.events.find(
                  (event) =>
                    event.kind === "phaseChanged" &&
                    event.phase === "Main" &&
                    event.turnSeat === openedPhase.turnSeat &&
                    event.turnCount === openedPhase.turnCount,
                );
                // Event revisions precede the patch. The closed batch names the
                // resulting revision, including a hatch coalesced with Main's patch.
                const mainBatch =
                  main &&
                  phaseBatchesRef.current.find((batch) =>
                    batch.events.some(
                      (event) =>
                        event.kind === "phaseChanged" &&
                        event.phase === "Main" &&
                        event.turnSeat === openedPhase.turnSeat &&
                        event.turnCount === openedPhase.turnCount,
                    ),
                  );
                const version =
                  mainBatch?.stateVersion ?? (main && "stateVersion" in main ? main.stateVersion : undefined);
                const snapshot =
                  version === undefined
                    ? undefined
                    : phaseStateRef.current.snapshots?.filter((candidate) => candidate.stateVersion <= version).at(-1);
                const player = snapshot?.state.players[openedPhase.turnSeat];
                setHeldBreedingState(player ? { seat: openedPhase.turnSeat, player } : undefined);
              } else if (banner.phase === "Main") {
                setHeldBreedingState(undefined);
                setHeldPhaseState(undefined);
              }
              setPhaseBanner((current) => (current?.key === banner.key ? null : current));
              await context.wait(TIMINGS.phaseBannerGap);
            } finally {
              visiblePhaseBannerRef.current = false;
              completedPhaseOrderRef.current = phaseOrder;
              setPhaseBanner((current) => (current?.key === banner.key ? null : current));
              setPendingPhaseBanners((count) => count - 1);
              if (context.cancelled || context.mode !== "live") {
                setHeldSuspendedIds(new Set());
                setHeldPhaseState(undefined);
                setHeldBreedingState(undefined);
                drawPhaseWaitingRef.current = null;
                setHeldDrawState(undefined);
              }
            }
          },
        });
      }
    }
    // Raw events, rather than batch closes, own the phase clock: the server closes
    // each batch only after sending its resulting state patch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseHistory]);

  useLayoutEffect(() => {
    // Capture the queue before paint so a decision cannot flash over a new batch.
    // The first pass is the baseline: a reconnect replays history, which must not replay
    // its sounds or reopen every panel the match has ever shown. Whatever is already known
    // when the hook first runs is that history, however many batches it spans — and a first
    // pass over nothing still spends the baseline, so a live match narrates its first batch.
    const replayingHistory = !cueBaselineRef.current;
    cueBaselineRef.current = true;
    const pending = batchesAfter(batches, lastCueBatchRef.current);
    if (lastCueBatchRef.current !== undefined && !batches.some((batch) => batch.id === lastCueBatchRef.current))
      deletionBurstPresentedRef.current.clear();
    if (pending.length === 0) return;
    lastCueBatchRef.current = pending.at(-1)!.id;
    // Each batch is its own moment, in order, even when several arrive in one render.
    for (const batch of pending) {
      enqueuePhaseOrderRef.current = phaseOrderFor(batch.events);
      presentBatch(batch.id, batch.stateVersion, batch.events, replayingHistory);
    }
    enqueuePhaseOrderRef.current = undefined;
    // presentBatch is rebuilt every render and reads only refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  // The board catches up on its own after the budget, whatever the queue did or failed to
  // do with the steps it is counting — the same discipline the decision barrier follows.
  useEffect(() => {
    if (presentedStateVersion === undefined) return;
    const timer = setTimeout(() => {
      presentationTelemetry.countBoardBudgetHit();
      progress.settle();
    }, PRESENTED_BOARD_BUDGET_MS);
    return () => clearTimeout(timer);
  }, [presentedStateVersion, progress]);

  /**
   * Snapshot revision barrier. Its budget bounds how long the displayed board
   * can lag behind the server; it does not open the decision dialog.
   * `decisionAnimationsPending` independently waits for actual finite queue
   * completion, including consequences in older batches.
   */
  useEffect(() => {
    if (!decisionPending || decisionStateVersion === undefined) {
      setDecisionBarrier(null);
      return;
    }
    // Nothing is being presented, or what is being presented is already newer than the
    // board the question is about: there is nothing to wait for.
    const reached = progress.current();
    if (reached === undefined || reached > decisionStateVersion) {
      progress.raiseFloor(decisionStateVersion);
      setDecisionBarrier(null);
      return;
    }
    setDecisionBarrier(decisionStateVersion);
    // A newer server revision is not proof that the viewer has seen the older
    // consequences. Keep their animations intact while bounding snapshot lag.
    const timer = setTimeout(() => {
      // The budget is spent: the board is handed over at the revision the question was
      // asked at, whatever the queue still had to say about the batches before it.
      presentationTelemetry.countDecisionBudgetHit();
      progress.raiseFloor(decisionStateVersion);
      setDecisionBarrier(null);
    }, PLAY_LEAD_IN_BUDGET_MS);
    return () => clearTimeout(timer);
  }, [decisionPending, decisionStateVersion, progress]);

  /**
   * Decision stall watchdog. `decisionAnimationsPending` waits for finite beats to finish and
   * has no clock of its own, so a beat that starts and never finishes holds the prompt closed
   * for good — and with the server blocked on that answer, the match is over without ending.
   *
   * The wait is on progress: any queue change restarts the clock, so a long healthy sequence
   * runs in full. Only a queue that has not moved for {@link DECISION_STALL_BUDGET_MS} is
   * stalled, and then the prompt is handed over. A fast-forward goes with it, to release
   * whatever skippable waits are still holding the frozen beat.
   */
  useEffect(() => {
    if (!decisionPending || !decisionAnimationsPending) {
      setDecisionStalled(false);
      return;
    }
    if (decisionStalled) return;
    const timer = setTimeout(() => {
      presentationTelemetry.countDecisionStallHit();
      queue.skip();
      setDecisionStalled(true);
    }, DECISION_STALL_BUDGET_MS);
    return () => clearTimeout(timer);
    // `queueActivity` is the heartbeat this effect waits on, not a value it reads.
  }, [decisionPending, decisionAnimationsPending, decisionStalled, queueActivity, queue]);

  // The barrier's own release: the queue has reached the revision the question was asked
  // at (or run dry), so the prompt may open over that board and never over an older one.
  useEffect(() => {
    if (decisionBarrier === null) return;
    // Caught up: the queue has run dry, or it has moved past the board the question is
    // about. Either way the prompt may open, and never over an older board than this.
    if (presentedStateVersion !== undefined && presentedStateVersion <= decisionBarrier) return;
    progress.raiseFloor(decisionBarrier);
    setDecisionBarrier(null);
  }, [decisionBarrier, presentedStateVersion, progress]);

  // A check the server has not closed yet keeps the board: its card is on stage and what it
  // did is still being read out. The server can stop in the middle of one to ask the viewer
  // something — the revealed card's own [Security] effect, or a reaction the removal armed,
  // which activates between the removal and the battle — and that question cannot wait for a
  // close that only arrives once it is answered. So the question itself hands the board back,
  // and it queues behind the check's own beats: the card is on screen and its clause has been
  // read out before the prompt for it opens.
  useEffect(() => {
    if (!decisionPending || pendingRevealKey === null) return;
    const key = pendingRevealKey;
    queue.enqueue({
      id: `security-decision-${key}`,
      track: CueTrack.CenterStage,
      skippable: false,
      run() {
        flushHeldNotices();
        setPendingRevealKey((current) => (current === key ? null : current));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionPending, pendingRevealKey, queue]);

  // Recent narration expires independently; decision barriers only wait for board beats.

  // A DP figure that moved gets a pulse. The driver is the synchronized
  // `currentDP` itself: the engine has already applied every modifier by the time
  // the number changes, so nothing here re-derives a rule. The first read is only
  // a baseline, which is what keeps a reconnect from pulsing the whole board.
  const dpSignature = state
    ? [...state.players]
        .flatMap((player) => [...player.battleArea, ...(player.breeding ? [player.breeding] : [])])
        .map((permanent) => `${permanent.permanentId}:${permanent.currentDP}`)
        .join(",")
    : "";
  useEffect(() => {
    if (!state) return;
    const current = new Map<string, number>();
    for (const player of state.players) {
      for (const permanent of player.battleArea) current.set(permanent.permanentId, permanent.currentDP);
      if (player.breeding) current.set(player.breeding.permanentId, player.breeding.currentDP);
    }
    const previous = dpByPermanentRef.current;
    dpByPermanentRef.current = current;
    if (!previous || queue.getMode() !== "live") return;
    const pulses = diffDpPulses({ previous, next: current, nextKey: dpPulseKeyRef.current });
    if (pulses.length === 0) return;
    dpPulseKeyRef.current += pulses.length;
    for (const pulse of pulses) {
      queue.enqueue({
        id: `dp-pulse-${pulse.key}`,
        // Several figures can move in one resolution, so each card pulses on its
        // own track rather than queueing behind another card's.
        track: `dpPulse-${pulse.permanentId}`,
        replace: true,
        async run(context) {
          if (context.mode !== "live") return;
          try {
            setDpPulses((pulsing) => new Map(pulsing).set(pulse.permanentId, pulse));
            await context.wait(dpPulseTotalMs(pulse.kind === "debuffFatal"));
          } finally {
            setDpPulses((pulsing) => {
              if (pulsing.get(pulse.permanentId)?.key !== pulse.key) return pulsing;
              const next = new Map(pulsing);
              next.delete(pulse.permanentId);
              return next;
            });
          }
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpSignature]);

  // A permanent that just had "can't attack" / "can't block" imposed on it jolts.
  // The driver is the server's own projection of those restrictions, so nothing here
  // reads card text; a permanent that entered already restricted is not a moment, which
  // is what the baseline read keeps out.
  const restrictionSignature = state
    ? [...state.players]
        .flatMap((player) => [...player.battleArea, ...(player.breeding ? [player.breeding] : [])])
        .map(
          (permanent) => `${permanent.permanentId}:${permanent.cannotAttack ? 1 : 0}${permanent.cannotBlock ? 1 : 0}`,
        )
        .join(",")
    : "";
  useEffect(() => {
    if (!state) return;
    const current = new Map<string, FreezeFlags>();
    for (const player of state.players) {
      for (const permanent of player.battleArea) {
        current.set(permanent.permanentId, {
          cannotAttack: permanent.cannotAttack,
          cannotBlock: permanent.cannotBlock,
        });
      }
    }
    const previous = restrictionsByPermanentRef.current;
    restrictionsByPermanentRef.current = current;
    if (!previous || queue.getMode() !== "live") return;
    const pulses = diffFreezePulses({ previous, next: current, nextKey: freezePulseKeyRef.current });
    if (pulses.length === 0) return;
    freezePulseKeyRef.current += pulses.length;
    for (const pulse of pulses) {
      queue.enqueue({
        id: `freeze-pulse-${pulse.key}`,
        // Several permanents can be locked by one resolution, so each jolts on its own
        // track rather than queueing behind another card's.
        track: `freezePulse-${pulse.permanentId}`,
        replace: true,
        async run(context) {
          if (context.mode !== "live") return;
          /* The jolt on the card and the badge under it already say the Digimon lost the
             action, and the effect's own clause is on screen beside them, so no notice. */
          try {
            setFreezePulses((pulsing) => new Map(pulsing).set(pulse.permanentId, pulse));
            await context.wait(TIMINGS.freezeShake);
          } finally {
            setFreezePulses((pulsing) => {
              if (pulsing.get(pulse.permanentId)?.key !== pulse.key) return pulsing;
              const next = new Map(pulsing);
              next.delete(pulse.permanentId);
              return next;
            });
          }
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restrictionSignature]);

  // A hand that grew was drawn into. The opening hand and a mulligan redeal are
  // not draws, so the first observed pair is only a baseline.
  const you = state?.players[viewerSeat];
  const opp = state?.players[otherSeat(viewerSeat)];
  useEffect(() => {
    if (drawPhaseWaitingRef.current === null) {
      previousDrawStateRef.current = state ? snapshotGameState(state) : undefined;
    }
  }, [state, state?.stateVersion, you?.handCount, opp?.handCount, phaseBanner]);
  useEffect(() => {
    if (you === undefined || opp === undefined) return;
    const heldSeat = drawPhaseWaitingRef.current;
    // The held side keeps every figure it had: its count, the flag that says the growth is
    // a turn-start draw, and the event count that proves the draw was already narrated.
    // They are read again on the pass the Draw ribbon releases.
    const heldSide: Side | undefined =
      heldSeat === null ? undefined : heldSeat === viewerSeat ? Side.Viewer : Side.Opponent;
    const previous = handCountsRef.current;
    handCountsRef.current = {
      you: heldSide === Side.Viewer && previous ? previous.you : you.handCount,
      opp: heldSide === Side.Opponent && previous ? previous.opp : opp.handCount,
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
    if (heldSide !== Side.Opponent && opp.handCount > previous.opp && eventDrawCountsRef.current.opp !== opp.handCount)
      launchDrawFlight(Side.Opponent, turnStart.opp);
    if (heldSide !== Side.Viewer && you.handCount > previous.you && eventDrawCountsRef.current.you !== you.handCount)
      launchDrawFlight(Side.Viewer, turnStart.you);
    eventDrawCountsRef.current = heldSide ? { [heldSide]: eventDrawCountsRef.current[heldSide] } : {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [you?.handCount, opp?.handCount, phaseBanner]);

  const { launchSecurityGainFlight, launchOpeningSecurityDeal, launchDrawFlight, launchDeckToUnderFlight } = cueFlights(
    {
      queue,
      anchors,
      viewerSeat,
      securityGainKeyRef,
      drawFlightKeyRef,
      setSecurityFlights,
      setSecurityDealCounts,
      setDrawFlights,
      setDrawBursts,
    },
  );

  useEffect(() => {
    if (you === undefined || opp === undefined) return;
    const previous = securityCountsRef.current;
    securityCountsRef.current = { you: you.securityCount, opp: opp.securityCount };
    if (!previous || mulliganOpen) return;
    // The opening deal is not a gain: nothing was recovered or stacked, the match simply
    // started. It is dealt to both seats out of the same empty board.
    if (openingSecurityDealRef.current === "pending") {
      const opening = previous.you === 0 && previous.opp === 0;
      openingSecurityDealRef.current = "done";
      if (opening) {
        if (you.securityCount > 0) launchOpeningSecurityDeal(viewerSeat, you.securityCount);
        if (opp.securityCount > 0) launchOpeningSecurityDeal(otherSeat(viewerSeat), opp.securityCount);
        securityGrowthClaimedRef.current.clear();
        return;
      }
    }
    const gains = [
      { seat: viewerSeat, side: Side.Viewer, amount: you.securityCount - previous.you },
      { seat: otherSeat(viewerSeat), side: Side.Opponent, amount: opp.securityCount - previous.opp },
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
  }, [you?.securityCount, opp?.securityCount]);

  /** The items on screen, in slot order, so the read-only views below are stable. */
  const presented = useMemo(() => [...narration.values()], [narration]);

  // Recent records are informational; board synchronization owns the input barrier.
  const narrationLock = false;

  const sidePanels = useMemo(() => presented.flatMap((item) => (item.panel ? [item.panel] : [])), [presented]);
  const notices = useMemo(
    () => [...presented.flatMap((item) => (item.notice ? [item.notice] : [])), ...(rejection ? [rejection] : [])],
    [presented, rejection],
  );

  /** Dismiss one record, defaulting to the oldest for keyboard callers. */
  function advanceNarration(id?: string): boolean {
    const target = id ?? narration.keys().next().value;
    if (target === undefined || !narration.has(target)) return false;
    presentationTelemetry.countManualAdvance();
    setNarration((items) => {
      const next = new Map(items);
      next.delete(target);
      return next;
    });
    return true;
  }

  /**
   * Collapse everything still queued: skippable waits go to nothing and every item still
   * to be read is dropped rather than narrated. The match log keeps all of them, so a
   * player who asked to fast-forward loses nothing they cannot read back.
   */
  function fastForward() {
    presentationTelemetry.countSkip();
    narrationSkipRef.current = true;
    narrationPhaseOrdersRef.current.clear();
    setNarration(new Map());
    queue.skip();
    void queue.idle().then(() => {
      narrationSkipRef.current = false;
    });
  }

  // Refusals expire independently of the recent effect records.
  useEffect(() => {
    if (!rejection) return;
    const remaining = noticeRemaining(rejection, Date.now());
    const timer = setTimeout(() => setRejection((current) => (current === rejection ? null : current)), remaining);
    return () => clearTimeout(timer);
  }, [rejection]);

  return {
    narration,
    rejection,
    dismissRejection: () => setRejection(null),
    advanceNarration,
    narrationLock,
    sidePanels,
    notices,
    dismissOwnEffectNotice: (cardId: string) => {
      suppressedOwnEffectsRef.current.add(cardId);
      heldNoticesRef.current = heldNoticesRef.current.filter((notice) => !isOwnEffectNotice(notice, cardId));
      // Already on screen: the dialog is about to print the same clause, so the item
      // either loses its notice or leaves with it.
      setNarration((slots) => {
        let changed = false;
        const next = new Map(slots);
        for (const [slot, item] of slots) {
          if (item.notice === undefined || !isOwnEffectNotice(item.notice, cardId)) continue;
          changed = true;
          if (item.panel) next.set(slot, { ...item, notice: undefined });
          else next.delete(slot);
        }
        return changed ? next : slots;
      });
    },
    raiseRejection: (reason: string) => {
      noticeSequenceRef.current += 1;
      setRejection(rejectionNotice(reason, `notice-${noticeSequenceRef.current}`, Date.now()));
    },
    attackAnnouncement,
    turnTransition,
    securityClash,
    securityBreak,
    securityBranch,
    optionBranch,
    securityRevealPending: pendingRevealKey !== null,
    decisionBarrierPending: decisionBarrier !== null,
    decisionAnimationsPending: decisionAnimationsPending && !decisionStalled,
    presentedStateVersion,
    presenting: presentedStateVersion !== undefined || pendingPhaseBanners > 0,
    unsuspendSweep,
    deleteBursts,
    zoneShowcase,
    permanentBursts,
    pendingPermanentIds,
    attackLunge,
    effectSources,
    deckRiffles,
    securityFlights,
    securityDealCounts,
    phaseBanner,
    phaseTransitionPending: pendingPhaseBanners > 0,
    heldDrawState,
    heldPhaseState,
    heldBreedingState,
    displayedPhase: pendingPhaseBanners > 0 ? announcedPhase : state?.phase,
    displayedTurn: pendingPhaseBanners > 0 ? announcedTurn : state && { seat: state.turnSeat, count: state.turnCount },
    heldSuspendedIds,
    combatImpactIds,
    fieldClash,
    dpPulses,
    freezePulses,
    securityHitSeat,
    heldSecurityCounts,
    drawFlights,
    drawBursts,
    playCue,
    skipAnimations: fastForward,
  };
}
