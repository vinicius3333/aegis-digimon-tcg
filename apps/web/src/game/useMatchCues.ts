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

import { CueTrack, OpeningDealState } from "./match/enums";
import { REDUCED_MOTION_QUERY } from "./match/environment";
import { holdsTheBoard } from "./match/tracks";
import { liveMode } from "./match/environment";
import { buildCardSiteIndex } from "./match/cardSiteIndex";
import { presentServerBatch } from "./match/present/presentBatch";
import type { MemoryHold } from "./match/present/memoryHold";
import { securityGrowthSeatOf } from "./match/present/securityGrowth";
import { securityHold } from "./match/securityHold";
import { cueFlights } from "./match/flights";
import { useDecisionBarrier } from "./match/queue/useDecisionBarrier";
import { usePhaseBanners } from "./match/queue/usePhaseBanners";
import { useDpPulses } from "./match/watchers/useDpPulses";
import { useDrawWatcher } from "./match/watchers/useDrawWatcher";
import { useRestrictionPulses } from "./match/watchers/useRestrictionPulses";
import { useSecurityCountWatcher } from "./match/watchers/useSecurityCountWatcher";
import { narrationStream } from "./match/narration/narrationStream";
import type { OwnEffectDialog } from "./match/narration/presentableNarration";
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
import {
  type GameState,
  type Seat,
  type SequencedServerEvent,
  type ServerEvent,
  type PresentationReport,
} from "@aegis/shared";
import { playSound, type SoundKind } from "../design/sound";
import { otherSeat } from "./boardModel";
import { buildInstanceIndex } from "./decisionModel";
import { batchesAfter, type ServerBatch } from "../net/serverBatches";
import { shouldPlayCue, type CueTimestamps } from "./soundEvents";
import {
  buildInstanceSeatIndex,
  buildInstanceArtIndex,
  type AttackAnnouncement,
  type SidePanel,
  type SidePanelLookup,
} from "./sidePanels";
import { isOwnEffectNotice, noticeRemaining, rejectionNotice, type MatchNotice } from "./notices";
import { narrationReadingTime, trimNarration, COLLAPSED_NARRATION_LIMIT, type NarrationItem } from "./narration";
import { type SecurityBranchScene, type SecurityClashAttacker, type SecurityClashScene } from "./securityClash";
import { type PermanentBurst, type ZoneShowcase } from "./showcases";
import { createAnimationQueue, type AnimationStep, type AnimationStepContext } from "./animationQueue";
import { createPresentationProgress } from "./presentationProgress";
import { observeGateExpiry } from "./match/presentationGate";
import type { DeletionReadyAt, PendingAnnounceGate, PresentationGate } from "./match/presentationGate";
import { presentationTelemetry } from "./presentationTelemetry";
import { type EffectActivation, type EffectSourceLookup } from "./effectSource";
import { type FieldClashScene, type OpenAttack } from "./fieldClash";
import { type PhaseBanner } from "./phaseBanner";
import { type DpPulse } from "./dpPulse";
import { type FreezeFlags, type FreezePulse } from "./freezePulse";

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
  // A gate that ran out its ceiling is a cue nobody handed over: the viewer sat through
  // the whole ceiling with the board held at an older revision. It is reported on the
  // diagnostic channel so the stall shows up in the match log on its own, rather than
  // waiting for a player to describe a frozen screen.
  useEffect(
    () =>
      observeGateExpiry(({ label, ceilingMs }) => {
        console.error("[MATCH_CUE] gate expired", { label, ceilingMs });
        try {
          presentationReporterRef.current?.({
            phase: "expired",
            stepId: label,
            track: "gate",
            clientTimestamp: Date.now(),
            durationMs: ceilingMs,
            mode: queue.getMode(),
            cancelled: false,
            skipping: false,
            failed: true,
            pendingCount: queue.pendingCount(),
          });
        } catch {
          // Diagnostic transport must never interrupt the presentation.
        }
      }),
    [queue],
  );
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
  const [heldMemory, setHeldMemory] = useState<MemoryHold | undefined>();
  const memoryHoldKeyRef = useRef(0);
  const [heldBlowState, setHeldBlowState] = useState<GameState | undefined>();
  const [heldBreedingState, setHeldBreedingState] = useState<MatchCues["heldBreedingState"]>();
  const [heldDeletions, setHeldDeletions] = useState<MatchCues["heldDeletions"]>(new Map());
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
  // The newest event a presented batch carried. Everything in the raw stream past it belongs
  // to a batch still open or still queued, whose growths are its own to narrate.
  const lastPresentedSeqRef = useRef(0);
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
  const suppressedOwnEffectsRef = useRef(new Map<string, OwnEffectDialog>());
  const queuedNarrationRef = useRef(new Map<string, NarrationItem>());
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
  const securityHoldRef = useRef<{ key: number; closed: boolean; handedOver?: boolean } | null>(null);
  // The blow a security battle has yet to land. A field battle makes its losers wait on
  // FIELD_CLASH_TOTAL_MS, a constant, because its scene is a constant; a check's scene is
  // not — its hold runs as long as the server takes to answer what the check asked. So the
  // wait is a gate rather than a duration: it opens when the outcome beat has played, and
  // whatever the check deleted shatters then, not seconds ahead of the battle that did it.
  const securityBlowRef = useRef<{ key: number; landed: boolean; gate: PresentationGate } | null>(null);
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
  const showcaseKeyRef = useRef(0);
  const dpPulseKeyRef = useRef(0);
  const freezePulseKeyRef = useRef(0);
  const effectSourceKeyRef = useRef(0);
  const optionDockKeyRef = useRef(0);
  const deletionReadyAtRef = useRef(new Map<string, DeletionReadyAt>());
  // The announcement a batch is holding its consequences behind, the one whatever is being
  // queued right now must wait for, and a gate armed before its clause was known.
  const effectAnnounceGateRef = useRef<PresentationGate | null>(null);
  const causingEffectGateRef = useRef<PresentationGate | null>(null);
  const pendingAnnounceGateRef = useRef<PendingAnnounceGate | null>(null);
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
  const openingSecurityDealRef = useRef(OpeningDealState.Pending);
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
    effectAnnounceGateRef,
    pendingAnnounceGateRef,
    setEffectSources,
    setNarration,
    collapseNarrationRef,
    narrationLimitRef,
    suppressedOwnEffectsRef,
    queuedNarrationRef,
    heldNoticesRef,
    heldPanelsRef,
    lastBatchIdRef,
    narrationSequenceRef,
    narrationRef,
  });

  /* A lit source belongs to the clause it raised: it goes out when that clause does, not
     on a clock of its own. Only a clause that actually reached the screen is followed —
     an activation still waiting for its own is not missing, it is early. */
  useEffect(() => {
    setEffectSources((sources) => {
      const kept = sources.filter(
        (source) => source.linked !== true || source.itemId === undefined || narration.has(source.itemId),
      );
      return kept.length === sources.length ? sources : kept;
    });
  }, [narration]);

  // Each record expires on its own clock, including while a decision is open.
  // Schedule only the next expiry, and cancel on unmount or replacement.
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
   * The board a security check's battle still needs: the attacker standing and suspended,
   * the cards still where the reveal found them. Taken here rather than from
   * `previousDrawStateRef`, which lags a render — that copy predates the declaration, so
   * the attacker it carries stands unsuspended and the board would answer the blow by
   * rotating the dying card upright.
   */
  function blowHoldState(): GameState | undefined {
    if (!state) return undefined;
    const live = snapshotGameState(state);
    const attackerId = securityAttackerRef.current?.permanentId;
    const standing = (board: GameState) =>
      board.players.some((player) => player.battleArea.some((permanent) => permanent.permanentId === attackerId));
    if (attackerId === undefined || standing(live)) return live;
    const source = [...(phaseStateRef.current.snapshots ?? [])]
      .reverse()
      .map((snapshot) => snapshot.state)
      .find(standing);
    if (!source) return live;
    const held = snapshotGameState(source);
    for (const player of held.players) {
      const attacker = player.battleArea.find((permanent) => permanent.permanentId === attackerId);
      if (attacker) attacker.isSuspended = true;
    }
    return held;
  }

  /**
   * Present one server batch. The pass itself lives in `match/present/presentBatch.ts`;
   * this wrapper is where the refs, setters and collaborators it reads are named. They are
   * gathered at call time rather than at render time, because the flight launchers below
   * are declared after the effect that starts the pass.
   */
  function presentBatch(
    batchId: string,
    stateVersion: number,
    fresh: readonly ServerEvent[],
    replayingHistory: boolean,
    continuingBatch = false,
  ) {
    presentServerBatch({
      batchId,
      stateVersion,
      fresh,
      replayingHistory,
      continuingBatch,
      present: presentBatch,
      viewerSeat,
      state,
      snapshots: snapshots ?? [],
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
      memoryHoldKeyRef,
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
    });
  }

  usePhaseBanners({
    batches,
    phaseEvents,
    eventTimeline,
    viewerSeat,
    queue,
    phaseOrdersRef,
    nextPhaseOrderRef,
    completedPhaseOrderRef,
    stepPhaseOrdersRef,
    lastPhaseEventRef,
    phaseBaselineRef,
    visiblePhaseBannerRef,
    drawPhaseWaitingRef,
    previousDrawStateRef,
    phaseStateRef,
    setPendingPhaseBanners,
    setTurnTransition,
    setAnnouncedTurn,
    setAnnouncedPhase,
    setPhaseBanner,
    setHeldDrawState,
    setHeldPhaseState,
    setHeldBreedingState,
    setHeldSuspendedIds,
    setUnsuspendSweep,
    playCue,
    narrationBefore,
  });

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
    lastPresentedSeqRef.current = pending.at(-1)!.events.at(-1)?.seq ?? lastPresentedSeqRef.current;
    // Each batch is its own moment, in order, even when several arrive in one render.
    for (const batch of pending) {
      enqueuePhaseOrderRef.current = phaseOrderFor(batch.events);
      presentBatch(batch.id, batch.stateVersion, batch.events, replayingHistory);
    }
    enqueuePhaseOrderRef.current = undefined;
    // presentBatch is rebuilt every render and reads only refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  /**
   * A check that stopped to ask the viewer something gives up its battle beat. The blow
   * is landed by the check's close, which the server cannot send until the answer comes
   * back, so anything still waiting on that gate — every deletion the check caused —
   * would hold the prompt for the dock's whole ceiling and the match would sit there.
   */
  function handOverSecurityBlow(key: number) {
    const blow = securityBlowRef.current;
    if (blow === null || blow.key !== key || blow.landed) return;
    blow.landed = true;
    blow.gate.release();
    setHeldBlowState(undefined);
  }

  useDecisionBarrier({
    decisionPending,
    decisionStateVersion,
    decisionAnimationsPending,
    decisionStalled,
    decisionBarrier,
    presentedStateVersion,
    pendingRevealKey,
    queueActivity,
    queue,
    progress,
    flushHeldNotices,
    securityHoldRef,
    handOverSecurityBlow,
    setDecisionBarrier,
    setDecisionStalled,
    setPendingRevealKey,
  });

  useDpPulses({ state, queue, dpByPermanentRef, dpPulseKeyRef, causingEffectGateRef, setDpPulses });

  useRestrictionPulses({
    state,
    queue,
    restrictionsByPermanentRef,
    freezePulseKeyRef,
    causingEffectGateRef,
    setFreezePulses,
  });

  const you = state?.players[viewerSeat];
  const opp = state?.players[otherSeat(viewerSeat)];
  const { launchSecurityGainFlight, launchOpeningSecurityDeal, launchDrawFlight, launchDeckToUnderFlight } = cueFlights(
    {
      queue,
      anchors,
      viewerSeat,
      causingEffectGateRef,
      securityGainKeyRef,
      drawFlightKeyRef,
      setSecurityFlights,
      setSecurityDealCounts,
      setDrawFlights,
      setDrawBursts,
    },
  );

  useDrawWatcher({
    state,
    viewer: you,
    opponent: opp,
    viewerSeat,
    mulliganOpen,
    phaseBanner,
    drawPhaseWaitingRef,
    previousDrawStateRef,
    handCountsRef,
    turnStartDrawRef,
    eventDrawCountsRef,
    launchDrawFlight,
  });

  useSecurityCountWatcher({
    viewer: you,
    opponent: opp,
    viewerSeat,
    mulliganOpen,
    securityCountsRef,
    openingSecurityDealRef,
    securityGrowthClaimedRef,
    noticeSequenceRef,
    lastBatchIdRef,
    growthNamedAhead: (seat) =>
      (phaseEvents ?? []).some(
        (event) =>
          "seq" in event &&
          (event as SequencedServerEvent).seq > lastPresentedSeqRef.current &&
          securityGrowthSeatOf(event) === seat,
      ),
    launchOpeningSecurityDeal,
    launchSecurityGainFlight,
    narrate,
  });

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
      const queuedItemIds = new Set(
        [...queuedNarrationRef.current.values()]
          .filter((item) => item.notice !== undefined && isOwnEffectNotice(item.notice, cardId))
          .map((item) => item.id),
      );
      suppressedOwnEffectsRef.current.set(cardId, { queuedItemIds, dialogOpen: true });
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
    releaseOwnEffectNotice: (cardId: string) => {
      const dialog = suppressedOwnEffectsRef.current.get(cardId);
      if (dialog === undefined) return;
      const stillQueued = [...dialog.queuedItemIds].filter((itemId) => queuedNarrationRef.current.has(itemId));
      if (stillQueued.length === 0) suppressedOwnEffectsRef.current.delete(cardId);
      else suppressedOwnEffectsRef.current.set(cardId, { queuedItemIds: new Set(stillQueued), dialogOpen: false });
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
    heldMemory,
    heldBlowState,
    heldBreedingState,
    heldDeletions,
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
