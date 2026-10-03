/* One measured run: a scenario room and the real client cue pipeline, on one fake clock.

   The server and the client share the clock, so what the viewer does waits on what the
   viewer sees: a move is played once the screen is idle, and a question is answered only
   after its prompt has opened. Every 16 ms (one frame) the harness hands the client what
   the socket delivered, the way `useRoom` does, and samples what the screen shows. */

import { act, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { vi } from "vitest";
import { CATALOG_DECKS, type DecisionRequest, type GameState, type SequencedServerEvent } from "@aegis/shared";
import { presentationTelemetry, type PresentationCounters } from "../../src/game/presentationTelemetry";
import { visibleBoard, type VisibleBoard } from "../../src/game/screen/model/visibleBoard";
import { useMatchCues, type MatchCueAnchors } from "../../src/game/useMatchCues";
import type { MatchCues } from "../../src/game/match/types";
import { emptyBatchInbox, receiveServerEvent, type BatchInbox, type ServerBatch } from "../../src/net/serverBatches";
import { recordSnapshot, selectPresentedState, type StateSnapshot } from "../../src/net/presentedState";
import { acknowledgeDecisionResponse, reconcileDecisionPatch } from "../../src/net/useRoom";
import type { PresentationControls, PresentationPacing, PresentationProbe } from "../../src/game/presentationProbe";
import {
  DEFAULT_PACING,
  PACING_BY_STYLE,
  setBasePacing,
  setEffectSpeed,
  type EffectSpeed,
  type PacingConfig,
  type PacingStyle,
} from "../../src/game/pacing";
import { openScenarioRoom, type WireMessage } from "./scenarioRoom";
import { answerCombatWindow, answerDecision, SKIP, type ScenarioPlan } from "./scenarios";

const VIEWER = 0;
export const FRAME_MS = 16;
const HUMAN_DECK_ID = "bt26-dgo-2026-08-28-7-chronomon";
const BOT_DECK_ID = "bt26-dgo-2026-08-28-8-plutomon";
/** The screen must stay idle this long, after the plan's goal is met, for the run to end. */
const SETTLED_MS = 1500;

export interface HumanTiming {
  /** From an idle board to the viewer's next move. */
  actMs: number;
  /** From an open prompt to the viewer's answer. */
  answerMs: number;
}

export const DEFAULT_HUMAN: HumanTiming = { actMs: 800, answerMs: 1000 };

/** `current` pacing, or paced effects in one of the pacing styles. */
export type HarnessPacing = "current" | PacingStyle;

export interface RunOptions {
  plan: ScenarioPlan;
  pacing: HarnessPacing;
  speed: EffectSpeed;
  human?: HumanTiming;
  basePacing?: PacingConfig;
  seed?: number;
}

export interface Clause {
  itemId: string;
  batchId: string;
  cardId: string;
  sourceInstanceId?: string;
  description?: string;
  /** Not dimmed under a later clause: the clause the viewer is meant to be reading. */
  active: boolean;
}

/** What the screen shows in one frame. */
export interface Sample {
  at: number;
  liveVersion: number;
  displayedVersion: number;
  visibleBoard?: VisibleBoard;
  clauses: Clause[];
  litSources: string[];
  focusedPermanentIds: string[];
  /** Keys of the keyed consequence cues on screen, as `<kind>-<key>`. */
  cues: string[];
  promptVisible: boolean;
  /** The card whose effect the open prompt is about. */
  promptSourceCardId?: string;
  /** A turn or phase ribbon holds the screen. */
  banner: boolean;
  queueIdle: boolean;
}

export interface StepRecord {
  step: object;
  id: string;
  track: string;
  batchId?: string;
  /** Enqueued while a server batch was being presented, rather than by a state watcher. */
  fromBatch: boolean;
  liveVersionAtQueue: number;
  queuedAt: number;
  startedAt?: number;
  endedAt?: number;
  outcome?: "finished" | "dropped";
  failed: boolean;
  cancelled: boolean;
  skipping: boolean;
}

export interface DecisionRecord {
  decisionId: string;
  kind: string;
  sourceCardId?: string;
  sourceInstanceId?: string;
  effectKey?: string;
  activationConfirmation?: boolean;
  arrivedAt: number;
  visibleAt?: number;
  answeredAt?: number;
  /** Only whole-effect optional refusals without any results may suppress an announcement. */
  optionalAccepted?: boolean;
}

export interface Recording {
  scenario: string;
  pacing: HarnessPacing;
  speed: EffectSpeed;
  startedAt: number;
  endedAt: number;
  timedOut: boolean;
  wire: readonly WireMessage[];
  batches: readonly (ServerBatch & { receivedAt: number })[];
  samples: readonly Sample[];
  steps: readonly StepRecord[];
  decisions: readonly DecisionRecord[];
  /** Presentation gates that ran out their ceiling instead of being released: a stall. */
  gateExpiries: readonly string[];
  counters: PresentationCounters;
  pendingSteps: number;
  /** Public printed DP by authoritative revision, before presentation holds. */
  dpSnapshots?: readonly {
    stateVersion: number;
    permanents: readonly { permanentId: string; topInstanceId: string; currentDP: number }[];
  }[];
  /** Public hand counts after each authoritative patch, including hidden opponent draws. */
  handCountSnapshots?: readonly { stateVersion: number; counts: readonly [number, number] }[];
  /** Where the server stood when the run ended, to tell a stuck run from a slow one. */
  end: { turnSeat: number; phase: string; pendingDecision?: string; resolvedBySeat: readonly [number, number] };
}

function geometry(): MatchCueAnchors {
  const board = document.createElement("div");
  const deck = document.createElement("div");
  const hand = document.createElement("div");
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
  vi.spyOn(deck, "getBoundingClientRect").mockReturnValue(new DOMRect(600, 400, 80, 100));
  vi.spyOn(hand, "getBoundingClientRect").mockReturnValue(new DOMRect(200, 500, 300, 80));
  return {
    board: { current: board },
    permanentCenter: () => ({ x: 120, y: 80 }),
    yourDeck: { current: deck },
    oppDeck: { current: deck },
    yourHandDock: { current: hand },
    oppHandStrip: { current: hand },
    yourSecurity: { current: null },
    oppSecurity: { current: null },
  };
}

/** A small deterministic generator, so nothing in a run depends on `Math.random`'s seed. */
function seededRandom(seed: number): () => number {
  let value = seed >>> 0 || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0x1_0000_0000;
  };
}

function cueKeys(cues: MatchCues): string[] {
  const keys: string[] = [];
  for (const flight of cues.drawFlights) keys.push(`draw-${flight.key}`);
  for (const burst of cues.deleteBursts) keys.push(`delete-${burst.key}`);
  for (const pulse of cues.dpPulses.values()) keys.push(`dp-${pulse.key}`);
  for (const pulse of cues.freezePulses.values()) keys.push(`freeze-${pulse.key}`);
  for (const burst of cues.permanentBursts.values()) keys.push(`burst-${burst.key}`);
  if (cues.revealShowcase) keys.push(`reveal-${cues.revealShowcase.key}`);
  if (cues.zoneShowcase) keys.push(`zone-${cues.zoneShowcase.key}`);
  return keys;
}

function clausesOf(cues: MatchCues): Clause[] {
  const clauses: Clause[] = [];
  for (const item of cues.narration.values()) {
    const body = item.notice?.body;
    if (body?.variant !== "effect") continue;
    clauses.push({
      itemId: item.id,
      batchId: item.batchId,
      cardId: body.cardId,
      ...(body.sourceInstanceId ? { sourceInstanceId: body.sourceInstanceId } : {}),
      ...(body.description ? { description: body.description } : {}),
      active: !item.superseded,
    });
  }
  return clauses;
}

interface HookProps {
  batches: readonly ServerBatch[];
  events: readonly SequencedServerEvent[];
  snapshots: readonly StateSnapshot[];
  decision: DecisionRequest | undefined;
  combatWindowOpen: boolean;
  combatWindowVersion: number | undefined;
}

export async function runScenario(options: RunOptions): Promise<Recording> {
  const { plan, pacing, speed } = options;
  const presentationPacing: PresentationPacing = pacing === "current" ? "current" : "sequential";
  const human = options.human ?? DEFAULT_HUMAN;
  setBasePacing(options.basePacing ?? (pacing === "current" ? DEFAULT_PACING : PACING_BY_STYLE[pacing]));
  setEffectSpeed(speed);
  presentationTelemetry.reset();
  vi.spyOn(Math, "random").mockImplementation(seededRandom(options.seed ?? 7));

  const startedAt = Date.now();
  let inbox: BatchInbox = emptyBatchInbox;
  let events: SequencedServerEvent[] = [];
  let snapshots: readonly StateSnapshot[] = [];
  let decision: DecisionRequest | undefined;
  let confirmedDecisionId: string | undefined;
  const answered = new Set<string>();
  const closedBatches: (ServerBatch & { receivedAt: number })[] = [];
  const decisions: DecisionRecord[] = [];
  const resolvedBySeat: [number, number] = [0, 0];
  const dpSnapshots = new Map<number, NonNullable<Recording["dpSnapshots"]>[number]>();
  const handCountSnapshots = new Map<number, NonNullable<Recording["handCountSnapshots"]>[number]>();
  const recordPublicState = (state: GameState) => {
    if (dpSnapshots.has(state.stateVersion)) return;
    handCountSnapshots.set(state.stateVersion, {
      stateVersion: state.stateVersion,
      counts: [state.players[0]?.handCount ?? 0, state.players[1]?.handCount ?? 0],
    });
    dpSnapshots.set(state.stateVersion, {
      stateVersion: state.stateVersion,
      permanents: [...state.players].flatMap((player) =>
        [...player.battleArea].map((permanent) => ({
          permanentId: permanent.permanentId,
          topInstanceId: permanent.topCard.instanceId,
          currentDP: permanent.currentDP,
        })),
      ),
    });
  };
  let decodedState: GameState | undefined;

  const onMessage = (message: WireMessage) => {
    if (message.channel === "state") {
      if (!decodedState) return;
      const reconciled = reconcileDecisionPatch({
        current: { decision, confirmedDecisionId },
        pendingDecisionId: decodedState.pendingDecision?.decisionId,
      });
      decision = reconciled.decision;
      confirmedDecisionId = reconciled.confirmedDecisionId;
      snapshots = recordSnapshot(snapshots, decodedState);
      recordPublicState(decodedState);
      return;
    }
    if (message.channel === "decision") {
      const request = message.request;
      if (answered.has(request.decisionId)) return;
      confirmedDecisionId =
        decodedState?.pendingDecision?.decisionId === request.decisionId ? request.decisionId : undefined;
      decision = request;
      if (request.seat === VIEWER)
        decisions.push({
          decisionId: request.decisionId,
          kind: request.kind,
          ...(request.sourceCardId ? { sourceCardId: request.sourceCardId } : {}),
          ...(request.sourceInstanceId ? { sourceInstanceId: request.sourceInstanceId } : {}),
          effectKey: request.options?.effectKey,
          activationConfirmation: request.options?.activationConfirmation,
          arrivedAt: message.at,
        });
      return;
    }
    const event = message.event;
    if (event.kind === "effectResolved") resolvedBySeat[event.seat] += 1;
    if (event.kind !== "batchClosed") events = [...events.slice(-99), event];
    const before = inbox.batches;
    inbox = receiveServerEvent(inbox, event);
    const closed = inbox.batches.at(-1);
    if (inbox.batches !== before && closed) closedBatches.push({ ...closed, receivedAt: message.at });
  };

  const room = openScenarioRoom({
    scenario: plan.id,
    seed: options.seed ?? 7,
    humanDeck: deckOf(HUMAN_DECK_ID),
    botDeckId: BOT_DECK_ID,
    presentationPacing,
    onMessage: (message) => onMessage(message),
  });
  decodedState = room.state;
  snapshots = recordSnapshot(snapshots, decodedState);
  recordPublicState(decodedState);

  let controls: PresentationControls | undefined;
  const steps = new Map<object, StepRecord>();
  let presentingBatch: string | undefined;
  const probe: PresentationProbe = {
    onQueue: (next) => (controls = next),
    onBatch: (batch) => (presentingBatch = batch.id),
    onStep(event) {
      const at = Date.now();
      let record = steps.get(event.step);
      if (!record) {
        record = {
          step: event.step,
          id: event.step.id,
          track: event.step.track ?? "main",
          ...(event.batch ? { batchId: event.batch.batchId } : {}),
          fromBatch: presentingBatch !== undefined,
          liveVersionAtQueue: decodedState?.stateVersion ?? 0,
          queuedAt: at,
          failed: false,
          cancelled: false,
          skipping: false,
        };
        steps.set(event.step, record);
      }
      if (event.phase === "started") record.startedAt = at;
      else if (event.phase === "finished" || event.phase === "dropped") {
        record.endedAt = at;
        record.outcome = event.phase;
      }
      record.failed ||= event.failed;
      record.cancelled ||= event.cancelled;
      record.skipping ||= event.skipping;
    },
  };

  const anchors = geometry();
  const propsNow = (): HookProps => {
    const window = decodedState?.combatWindow;
    return {
      batches: inbox.batches,
      events,
      snapshots,
      decision,
      combatWindowOpen: window?.seat === VIEWER,
      combatWindowVersion: window?.seat === VIEWER ? decodedState?.stateVersion : undefined,
    };
  };
  const view = renderHook(
    (props: HookProps) => {
      const viewerDecision = props.decision?.seat === VIEWER && props.decision.kind !== "mulligan";
      const cues = useMatchCues({
        batches: props.batches,
        phaseEvents: props.events,
        state: decodedState,
        snapshots: props.snapshots,
        viewerSeat: VIEWER,
        mulliganOpen: false,
        decisionPending: viewerDecision || props.combatWindowOpen,
        decisionStateVersion: viewerDecision ? props.decision!.stateVersion : props.combatWindowVersion,
        ...(viewerDecision && props.decision!.sourceCardId
          ? { decisionSourceCardId: props.decision!.sourceCardId }
          : {}),
        anchors,
        onActionRejected: () => {},
        devProbe: probe,
        presentationPacing,
      });
      // Runs after the cue pipeline's own batch pass: a step enqueued later came from a watcher.
      useLayoutEffect(() => {
        presentingBatch = undefined;
      });
      return cues;
    },
    { initialProps: propsNow() },
  );

  const samples: Sample[] = [];
  const planMoves = [...plan.moves];
  let moveReadySince: number | undefined;
  let promptOpenSince: number | undefined;
  let settledSince: number | undefined;
  let timedOut = true;

  for (let elapsed = 0; elapsed <= plan.maxMs; elapsed += FRAME_MS) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FRAME_MS);
    });
    view.rerender(propsNow());
    const now = Date.now();
    const cues = view.result.current;
    const live = decodedState!;
    const displayed = selectPresentedState({ live, snapshots, presentedStateVersion: cues.presentedStateVersion });
    const viewerDecision = decision?.seat === VIEWER && decision.kind !== "mulligan" ? decision : undefined;
    const combatWindow = live.combatWindow?.seat === VIEWER;
    const asked = viewerDecision !== undefined || combatWindow;
    const promptVisible = asked && !cues.decisionAnimationsPending;
    const queueIdle = controls?.queue.isIdle() ?? true;
    samples.push({
      at: now,
      liveVersion: live.stateVersion ?? 0,
      displayedVersion: displayed?.stateVersion ?? 0,
      ...(displayed
        ? { visibleBoard: visibleBoard({ live, displayed, viewerSeat: VIEWER, cues, presentationPacing }) }
        : {}),
      clauses: clausesOf(cues),
      litSources: cues.effectSources.map((source) => source.cardId),
      focusedPermanentIds: cues.effectSources.flatMap((source) =>
        source.linked !== true && source.site.zone === "field" ? [source.site.permanentId] : [],
      ),
      cues: cueKeys(cues),
      promptVisible,
      ...(promptVisible && viewerDecision?.sourceCardId ? { promptSourceCardId: viewerDecision.sourceCardId } : {}),
      banner: cues.phaseBanner !== null || cues.turnTransition !== null || cues.phaseTransitionPending,
      queueIdle,
    });

    if (promptVisible) {
      promptOpenSince ??= now;
      const record =
        viewerDecision && [...decisions].reverse().find((entry) => entry.decisionId === viewerDecision.decisionId);
      if (record) record.visibleAt ??= now;
      if (now - promptOpenSince >= human.answerMs) {
        promptOpenSince = undefined;
        if (viewerDecision) {
          const response = answerDecision(viewerDecision, live, plan.answers);
          if (response) {
            answered.add(viewerDecision.decisionId);
            if (record) {
              record.answeredAt = now;
              if (response.kind === "optional") record.optionalAccepted = response.accept;
            }
            const acknowledged = acknowledgeDecisionResponse({
              current: { decision, confirmedDecisionId },
              decisionId: viewerDecision.decisionId,
            });
            decision = acknowledged.decision;
            confirmedDecisionId = acknowledged.confirmedDecisionId;
            room.send({ type: "respondDecision", decisionId: viewerDecision.decisionId, response });
          }
        } else {
          const intent = answerCombatWindow(live, plan.answers);
          if (intent) room.send(intent);
        }
      }
      continue;
    }
    promptOpenSince = undefined;

    const idle = !asked && queueIdle && live.pendingDecision === undefined;
    const nextMove = planMoves[0];
    if (idle && nextMove) {
      let intent = nextMove(live);
      if (intent === SKIP) {
        planMoves.shift();
        intent = undefined;
      }
      moveReadySince = intent ? (moveReadySince ?? now) : undefined;
      if (intent && now - moveReadySince! >= human.actMs) {
        room.send(intent);
        planMoves.shift();
        moveReadySince = undefined;
      }
    } else moveReadySince = undefined;

    const goalMet = planMoves.length === 0 && plan.finished(room.room.state, resolvedBySeat);
    settledSince = goalMet && idle ? (settledSince ?? now) : undefined;
    if (settledSince !== undefined && now - settledSince >= SETTLED_MS) {
      timedOut = false;
      break;
    }
  }

  const recording: Recording = {
    scenario: plan.variant ?? plan.id,
    pacing,
    speed,
    startedAt,
    endedAt: Date.now(),
    timedOut,
    wire: [...room.wire],
    batches: closedBatches,
    samples,
    steps: [...steps.values()],
    decisions,
    gateExpiries: [],
    counters: presentationTelemetry.read().counters,
    pendingSteps: controls?.queue.pendingCount() ?? 0,
    dpSnapshots: [...dpSnapshots.values()],
    handCountSnapshots: [...handCountSnapshots.values()],
    end: {
      turnSeat: room.room.state.turnSeat,
      phase: room.room.state.phase,
      ...(room.room.state.pendingDecision
        ? { pendingDecision: `${room.room.state.pendingDecision.kind}@${room.room.state.pendingDecision.seat}` }
        : {}),
      resolvedBySeat: [...resolvedBySeat],
    },
  };
  view.unmount();
  room.dispose();
  vi.mocked(Math.random).mockRestore();
  return recording;
}

function deckOf(deckId: string) {
  const deck = CATALOG_DECKS.find((entry) => entry.deckId === deckId);
  if (!deck) throw new Error(`missing catalog deck ${deckId}`);
  return { mainDeck: [...deck.decklist.mainDeck], eggDeck: [...deck.decklist.eggDeck] };
}
