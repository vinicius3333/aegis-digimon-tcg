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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { snapshotGameState, type StateSnapshot } from "../net/presentedState";
import type { RefObject } from "react";
import {
  getCardDefinition,
  isOption,
  type GameState,
  type Seat,
  type ServerEvent,
  type PresentationReport,
} from "@aegis/shared";
import { playSound, type SoundKind } from "../design/sound";
import { buildInstanceIndex, otherSeat } from "./boardModel";
import { batchesAfter, type ServerBatch } from "../net/serverBatches";
import { shouldPlayCue, soundForEvent, type CueTimestamps } from "./soundEvents";
import {
  attackAnnouncementFromEvent,
  buildInstanceSeatIndex,
  buildInstanceArtIndex,
  sidePanelFromEvent,
  type AttackAnnouncement,
  type SidePanel,
  type SidePanelLookup,
} from "./sidePanels";
import {
  effectNoticeFromEvent,
  deletionNoticesFromEvent,
  isOwnEffectNotice,
  noticeRemaining,
  keywordNoticeFromEvent,
  preventionNoticeFromEvent,
  recoveryNoticeFromEvent,
  rejectionNotice,
  securityGainNotice,
  securityGainNoticeFromEvent,
  type MatchNotice,
} from "./notices";
import {
  buildNarrationItems,
  narrationReadingTime,
  pushNarrationItem,
  trimNarration,
  COLLAPSED_NARRATION_LIMIT,
  TOUCH_NARRATION_LIFETIME_SCALE,
  type NarrationItem,
} from "./narration";
import {
  buildSecurityBranchScene,
  buildSecurityBreakScene,
  buildSecurityDestructionScene,
  buildSecurityDockScene,
  buildSecurityRevealScene,
  securityDestructionsFromEvents,
  securityCheckSegments,
  settleSecurityClashScene,
  SECURITY_BRANCH_TOTAL_MS,
  SECURITY_BREAK_TIMINGS,
  SECURITY_DESTROY_OUTCOME_AT_MS,
  SECURITY_DESTROY_TOTAL_MS,
  type SecurityBranchScene,
  type SecurityBreakScene,
  type SecurityClashAttacker,
  type SecurityClashScene,
} from "./securityClash";
import {
  burstColorFor,
  deletionAnchorIdsFromEvent,
  hasTurnStartDraw,
  permanentBurstFromEvent,
  zoneShowcaseFromEvent,
  type PermanentBurst,
  type ZoneShowcase,
} from "./showcases";
import {
  createAnimationQueue,
  type AnimationQueueMode,
  type AnimationStep,
  type AnimationStepContext,
} from "./animationQueue";
import { createPresentationProgress, PRESENTED_BOARD_BUDGET_MS } from "./presentationProgress";
import { presentationTelemetry } from "./presentationTelemetry";
import {
  effectActivationFromEvent,
  effectActivationTrack,
  type EffectActivation,
  type EffectSourceLookup,
  type EffectSourceSite,
} from "./effectSource";
import { deckRiffleFromEvent, type DeckRiffle } from "./deckChrome";
import { buildFieldClashScene, trackOpenAttack, type FieldClashScene, type OpenAttack } from "./fieldClash";
import { isAnnouncedPhase, phaseBannerFrom, type PhaseBanner } from "./phaseBanner";
import { dpPulses as diffDpPulses, type DpPulse } from "./dpPulse";
import { freezePulses as diffFreezePulses, type FreezeFlags, type FreezePulse } from "./freezePulse";
import {
  CARD_BURST_PEAK_MS,
  CLASH_DOCK_AT_MS,
  CLASH_OUTCOME_AT_MS,
  CLASH_REVEAL_SHOWN_AT_MS,
  CLASH_TOTAL_MS,
  COMBAT_IMPACT_TOTAL_MS,
  DECISION_STALL_BUDGET_MS,
  dpPulseTotalMs,
  FIELD_CLASH_IMPACT_AT_MS,
  FIELD_CLASH_LUNGE_AT_MS,
  FIELD_CLASH_TOTAL_MS,
  PLAY_LEAD_IN_BUDGET_MS,
  SECURITY_BRANCH_IN_MS,
  SECURITY_DOCK_CLOSE_MS,
  SHOWCASE_TOTAL_MS,
  TIMINGS,
} from "./timings";
import type { ColorName } from "../design/theme";

/**
 * Card back sent from a deck pile to the hand that just grew, in board coordinates.
 * `x`/`y` are the centre of the deck pile: `.game-draw-flight` pulls itself back
 * over that point with its own negative margins, so the card back can be resized
 * per layout without the launch point drifting.
 */
export type DrawFlight = { key: number; x: number; y: number; dx: number; dy: number; duration: number };

/** Starburst left where a turn-start draw lands, in board coordinates. */
export type DrawBurst = { key: number; x: number; y: number };

export type AttackLunge = { permanentId: string; direction: "up" | "down" };

/** The shield break, and which of its two beats the defender's shield is playing. */
export type SecurityBreakCue = SecurityBreakScene & { phase: "arm" | "break" };

/** The green-and-orange burst left where a deleted permanent stood, in board coordinates. */
export type DeleteBurst = {
  key: number;
  x: number;
  y: number;
  /** Effect deletions get a brief energy ring in addition to the card shatter. */
  effectDeletion?: boolean;
  /** The card that was there, so its own art can be the thing that shatters. */
  cardId?: string;
  artId?: string;
  color?: ColorName;
};

/** The unsuspend phase sweeping one player's board, ordered by slot. */
export type UnsuspendSweep = { seat: Seat; key: number };

/** Must match `.game-delete-burst` in game.css. */
const DELETE_BURST_SIZE = 96;

/** The phase name the protocol uses for the step that unsuspends the turn player's board. */
const UNSUSPEND_PHASE = "Active";

/** Slots the sweep staggers across before the last card has started turning. */
const UNSUSPEND_SWEEP_SLOTS = 8;

/** How long the whole board takes to finish unsuspending, last slot included. */
const UNSUSPEND_SWEEP_MS = TIMINGS.suspendRotate + UNSUSPEND_SWEEP_SLOTS * TIMINGS.suspendStagger;

/**
 * The centre-screen showcase and the security clash share one track, so the
 * board never holds two cards up at once — a security check replaces whatever
 * showcase was mid-flight rather than painting over it.
 */
const CENTER_STAGE_TRACK = "centerStage";

/**
 * Whether a step is a MOMENT — something the viewer is being told — rather than decoration.
 *
 * Only a moment holds the board back (net/presentedState.ts): while a deletion's trigger is
 * being read out, the board still shows the permanent it is about. Decoration (a draw
 * flight, a DP pulse, a burst) is drawn over whatever board is on screen and must never
 * freeze it, and the security dock waits on the server rather than on a reader, so it would
 * freeze the board for as long as the check takes.
 */
const BOARD_HOLDING_TRACKS: readonly string[] = [
  CENTER_STAGE_TRACK,
  // The battle and the blow that ends it: the board stays the board the battle was fought
  // on until it has been fought, whatever the server has resolved since.
  "combatImpact",
  "combatNotices",
];

function holdsTheBoard(step: AnimationStep): boolean {
  if (step.holdsBoard === false) return false;
  const track = step.track ?? "";
  return (
    step.id.startsWith("narration-step-") ||
    track.startsWith("narration") ||
    track.startsWith("deleteBurst-") ||
    BOARD_HOLDING_TRACKS.includes(track)
  );
}

/**
 * The open-ended wait that keeps a `[Security]` card parked in its dock until the check
 * closes. It is deliberately NOT the centre-stage track: the dock stays up across whole
 * batches, and the cues the docked card's effect provokes must be able to follow its
 * arrival on the centre-stage track instead of waiting for it to leave.
 */
const SECURITY_DOCK_TRACK = "securityDock";

/**
 * The used Option's own dock: its entrance, and the open-ended hold that keeps the card on
 * screen until the Option finishes resolving. Open-ended for the same reason the security dock
 * is — the Option finishes by the viewer ANSWERING its decisions — so these two tracks are
 * exempt from the same barriers. A phase ribbon that waits for them waits for an answer that
 * cannot arrive until the ribbon lets the prompt through, and every other cue is gated behind
 * the ribbon: one docked Option freezes the whole screen until the dock's failsafe ceiling.
 */
const OPTION_DOCK_TRACK = "optionDock";
const OPTION_DOCK_HOLD_TRACK = "optionDockHold";
const OPTION_DOCK_TRACKS: readonly string[] = [OPTION_DOCK_TRACK, OPTION_DOCK_HOLD_TRACK];

/**
 * The open-ended wait that keeps a revealed Digimon centre-stage until the battle it is in
 * has actually been decided. Same reasoning as the dock, and for the same reason not the
 * centre-stage track: the deletion the battle causes, and everything that reacts to it,
 * has to be able to play while the card is still up.
 */
const SECURITY_HOLD_TRACK = "securityHold";

/** Index of the last event of a kind in the batch, or -1. */
function lastIndexOfKind(events: readonly ServerEvent[], kind: ServerEvent["kind"]): number {
  for (let index = events.length - 1; index >= 0; index -= 1) if (events[index]!.kind === kind) return index;
  return -1;
}

export type TurnTransitionCue = { endingSeat: number; nextSeat: number; turnCount: number };

/** The board elements a draw flight is measured between. */
export interface MatchCueAnchors {
  board: RefObject<HTMLDivElement | null>;
  /**
   * Where a permanent last stood, in board coordinates, by permanent id or by the instance
   * id of its top card. Deletions are narrated after the board has already dropped the
   * permanent, so the caller keeps the last measurement rather than the element.
   */
  permanentCenter?: (permanentId: string) => { x: number; y: number } | undefined;
  /** The card that was on top of a permanent, kept the same way and for the same reason. */
  permanentCardId?: (permanentId: string) => string | undefined;
  yourDeck: RefObject<HTMLDivElement | null>;
  oppDeck: RefObject<HTMLDivElement | null>;
  yourHandDock: RefObject<HTMLDivElement | null>;
  oppHandStrip: RefObject<HTMLDivElement | null>;
  yourSecurity: RefObject<HTMLDivElement | null>;
  oppSecurity: RefObject<HTMLDivElement | null>;
}

export interface MatchCues {
  /** Recent moments, keyed by occurrence ID and ordered by presentation. */
  narration: ReadonlyMap<string, NarrationItem>;
  /** The viewer's own refused action: immediate, and outside the queue. */
  rejection: MatchNotice | null;
  dismissRejection: () => void;
  /** Dismiss one item by ID, or the oldest when omitted. */
  advanceNarration: (id?: string) => boolean;
  /** Compatibility signal: recent narration never locks input. */
  narrationLock: boolean;
  /** The side panels currently on screen, oldest slot first. A read-only view of {@link narration}. */
  sidePanels: readonly SidePanel[];
  /** The notices currently on screen, the refusal included. A read-only view of {@link narration}. */
  notices: readonly MatchNotice[];
  /**
   * Drops the viewer's own effect notice for a card whose decision dialog is now open —
   * the dialog already names the card and prints the clause the notice would repeat.
   */
  dismissOwnEffectNotice: (cardId: string) => void;
  /** Raises a notice for a refused action, which no server event narrates for the viewer. */
  raiseRejection: (reason: string) => void;
  attackAnnouncement: AttackAnnouncement | null;
  turnTransition: TurnTransitionCue | null;
  securityClash: SecurityClashScene | null;
  /** The defender's shield arming and shattering, ahead of the reveal. */
  securityBreak: SecurityBreakCue | null;
  /** The revealed card, held to the side while its effect resolves. */
  securityBranch: SecurityBranchScene | null;
  /** A used Option parked with the security-effect animation while its [Main] resolves. */
  optionBranch: SecurityBranchScene | null;
  /**
   * True from the moment a security check is queued until the centre-stage scene has
   * finished showing the revealed card. Nothing that speaks for that card — its effect
   * notice, its branch, the decision it asks the viewer — may be presented while it is
   * set (battle-animation-spec.md §4b: the reveal is steps 6–9, the effect is step 10b).
   * A card an effect trashes out of a stack holds the same way, until its scene is over.
   */
  securityRevealPending: boolean;
  /**
   * The viewer's prompt is waiting for the presentation to reach the board the question
   * was asked about. The queue is fast-forwarding through the batches in between and the
   * prompt opens as soon as it arrives, or at the latest after
   * {@link PLAY_LEAD_IN_BUDGET_MS} — a beat that never runs can never leave the viewer
   * unable to answer (docs/presentation-queue-plan.md 3.2, decision barrier).
   */
  decisionBarrierPending: boolean;
  /** Finite visual beats must finish before any new decision is displayed. */
  decisionAnimationsPending: boolean;
  /**
   * The server revision the queue is presenting, or undefined when it is caught up and
   * the live state is what to show. `GameScreen` renders the snapshot at this revision
   * (net/presentedState.ts); interactivity keeps reading the live state.
   */
  presentedStateVersion: number | undefined;
  /**
   * The queue has something on screen to fast-forward: a moment is being read out, or the
   * board is still held at an older revision than the live state. Desktop shows its skip
   * button while this is set; a phone taps the board instead.
   */
  presenting: boolean;
  /** The player whose board the unsuspend phase is currently sweeping. */
  unsuspendSweep: UnsuspendSweep | null;
  /** Bursts left where permanents were deleted, in board coordinates. */
  deleteBursts: readonly DeleteBurst[];
  /** The opponent's card, held centre-screen while its zone change is announced. */
  zoneShowcase: ZoneShowcase | null;
  /** The colour-keyed burst each permanent is currently playing, by permanent id. */
  permanentBursts: ReadonlyMap<string, PermanentBurst>;
  /** Permanents held back from the board while their showcase is still up. */
  pendingPermanentIds: ReadonlySet<string>;
  attackLunge: AttackLunge | null;
  /** "Breeding Phase" / "Main Phase", announced as the phase opens. */
  phaseBanner: PhaseBanner | null;
  /** Turn actions wait until all queued phase announcements have finished. */
  phaseTransitionPending: boolean;
  /**
   * Hand/deck presentation for the seat whose queued draw phase has not reached the
   * screen yet. Only that seat is held: the other one keeps drawing on screen, because
   * its cards belong to a turn the ribbons have already announced.
   */
  heldDrawState: { seat: Seat; state: GameState } | undefined;
  /** Keep card rotation from exposing a Main attack before its phase announcement. */
  heldPhaseState: GameState | undefined;
  /**
   * The board as it stood when a security check revealed its card, held until that check's
   * battle has been drawn. The server trashes the loser before it closes the check, and the
   * board draws whatever state says the moment the patch lands, so without this the attacker
   * leaves the field and the cards reach the trash while the clash that kills them is still
   * playing centre stage — the viewer watches a battle between two cards already in the bin.
   */
  heldBlowState: GameState | undefined;
  /** Keep the raising area unchanged until its Breeding announcement finishes. */
  heldBreedingState: { seat: Seat; player: GameState["players"][number] } | undefined;
  /** The last announced phase persists through the gaps between ribbons. */
  displayedPhase: GameState["phase"] | undefined;
  /**
   * The turn the ribbons have reached. The live state flips the moment the server resolves
   * the handover, which on a fast opponent lands in the same patch as the cues for the turn
   * that just ended; a readout bound to it announces the next turn over a card still in
   * flight. Bind the readout to this instead — legality still reads the live state.
   */
  displayedTurn: { seat: Seat; count: number } | undefined;
  /** Keep last turn's suspended cards rotated until their Unsuspend announcement starts. */
  heldSuspendedIds: ReadonlySet<string>;
  /** The zone-specific moment each activating effect source is currently playing. */
  effectSources: readonly EffectActivation[];
  /** The deck piles currently riffling, as `${seat}:${pile}`. */
  deckRiffles: ReadonlySet<string>;
  /** The seats whose security stack a recovered card is currently flying back onto. */
  securityFlights: ReadonlySet<number>;
  /**
   * While the opening five cards are being dealt, how many of them a seat's shield has
   * already been seen to take. The stack is full on the server from the first patch, so
   * the shield counts up with the deal rather than starting at its final figure.
   */
  securityDealCounts: ReadonlyMap<Seat, number>;
  /** Permanents currently taking the claw and the shake for a battle they lost. */
  combatImpactIds: ReadonlySet<string>;
  /** The board battle currently playing: its arrow stays up and its losers keep a ghost on the board. */
  fieldClash: FieldClashScene | null;
  /** The DP change each permanent is currently pulsing over, by permanent id. */
  dpPulses: ReadonlyMap<string, DpPulse>;
  /** The attack/block lock each permanent is currently jolting over, by permanent id. */
  freezePulses: ReadonlyMap<string, FreezePulse>;
  securityHitSeat: number | null;
  /**
   * The figure each shield must keep while a scene is still holding a card the board has
   * already dropped. Pass it through {@link shieldSecurityCount} with the live count —
   * absent for a seat whose stack nothing is currently spending.
   */
  heldSecurityCounts: ReadonlyMap<Seat, number>;
  drawFlights: readonly DrawFlight[];
  drawBursts: readonly DrawBurst[];
  /** Plays a cue for a locally triggered action, sharing the repeat suppression with the event fan-out. */
  playCue: (kind: SoundKind) => void;
  /** Fast-forward the decorative cues currently in flight. */
  skipAnimations: () => void;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** The phone layouts, matching GameScreen's `NARROW_LAYOUT_QUERY` and the touch block in game.css. */
const TOUCH_LAYOUT_QUERY = "(width < 600px), (height < 520px) and (orientation: landscape)";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function isTouchLayout(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(TOUCH_LAYOUT_QUERY).matches;
}

function remove(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!ids.has(id)) return ids;
  const next = new Set(ids);
  next.delete(id);
  return next;
}

interface PresentationGate {
  open: boolean;
  opened: Promise<void>;
  release(): void;
}

const GATE_POLL_MS = 16;
const CONSEQUENCE_GATE_MAX_MS = 5_000;

function createPresentationGate(): PresentationGate {
  let openGate = () => {};
  const opened = new Promise<void>((resolve) => {
    openGate = resolve;
  });
  const gate: PresentationGate = {
    open: false,
    opened,
    release() {
      if (gate.open) return;
      gate.open = true;
      openGate();
    },
  };
  return gate;
}

async function waitForGate(
  gate: PresentationGate | null | undefined,
  context: AnimationStepContext,
  ceilingMs: number,
): Promise<void> {
  if (!gate || gate.open || context.mode === "replay") return;
  const deadline = Date.now() + ceilingMs;
  while (!gate.open && !context.cancelled && Date.now() < deadline) {
    let stopPolling = () => {};
    const poll = new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, GATE_POLL_MS);
      stopPolling = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    await Promise.race([gate.opened, poll]);
    stopPolling();
  }
}

function documentHidden(): boolean {
  return typeof document !== "undefined" && document.hidden === true;
}

function liveMode(): AnimationQueueMode {
  return prefersReducedMotion() || documentHidden() ? "drain" : "live";
}

/**
 * Where every card the viewer can see currently sits: which permanent, trash or
 * hand holds it, and which seat owns each visible instance. A pure read of the
 * synchronized state — the client learns nothing here it was not already sent.
 */
function buildCardSiteIndex(state: GameState): {
  locate: EffectSourceLookup;
  seatOf: (instanceId: string) => Seat | undefined;
  topInstanceOf: (permanentId: string) => string | undefined;
} {
  const sites = new Map<string, ReturnType<EffectSourceLookup>>();
  const instances = new Map<string, EffectSourceSite>();
  const hosts = new Map<string, EffectSourceSite>();
  const seats = new Map<string, Seat>();
  const tops = new Map<string, string>();
  state.players.forEach((player, playerSeat) => {
    const seat = playerSeat as Seat;
    const key = (cardId: string) => `${seat}:${cardId}`;
    const permanents = [...player.battleArea, ...(player.breeding ? [player.breeding] : [])];
    for (const permanent of permanents) {
      const site: EffectSourceSite = { zone: "field", permanentId: permanent.permanentId };
      hosts.set(key(permanent.permanentId), site);
      for (const card of [permanent.topCard, ...(permanent.stack ?? []), ...(permanent.linked ?? [])]) {
        if (card?.instanceId) instances.set(key(card.instanceId), site);
      }
      const cardId = permanent.topCard?.cardId;
      if (cardId && !sites.has(key(cardId)))
        sites.set(key(cardId), { zone: "field", permanentId: permanent.permanentId });
      if (permanent.topCard?.instanceId) tops.set(permanent.permanentId, permanent.topCard.instanceId);
    }
    // Inherited and copied effects (Succession) keep naming their source card
    // after it moves under the current top. Its host owns the field highlight.
    // Check all tops first, then sources, before looking for loose copies.
    for (const permanent of permanents) {
      for (const card of [...(permanent.stack ?? []), ...(permanent.linked ?? [])]) {
        if (card?.cardId && !sites.has(key(card.cardId)))
          sites.set(key(card.cardId), { zone: "field", permanentId: permanent.permanentId });
      }
    }
    for (const card of player.trash) {
      if (card?.instanceId) instances.set(key(card.instanceId), { zone: "trash", instanceId: card.instanceId });
      if (card?.cardId && !sites.has(key(card.cardId)))
        sites.set(key(card.cardId), { zone: "trash", instanceId: card.instanceId });
    }
    for (const card of player.hand ?? []) {
      if (card?.instanceId) instances.set(key(card.instanceId), { zone: "hand", instanceId: card.instanceId });
      if (card?.cardId && !sites.has(key(card.cardId)))
        sites.set(key(card.cardId), { zone: "hand", instanceId: card.instanceId });
      if (card?.instanceId) seats.set(card.instanceId, seat);
    }
    // No deck/eggDeck entries: those zones are never sent to any client (HIDDEN_ZONE_VIEW_TAG),
    // so a card only becomes locatable once it reaches a zone the viewer can see.
  });
  return {
    locate: (cardId, seat, source) => {
      if (source?.sourcePermanentId) {
        const host = hosts.get(`${seat}:${source.sourcePermanentId}`);
        if (host) return host;
      }
      if (source?.sourceInstanceId) return instances.get(`${seat}:${source.sourceInstanceId}`);
      if (source?.sourcePermanentId) return undefined;
      return sites.get(`${seat}:${cardId}`);
    },
    seatOf: (instanceId) => seats.get(instanceId),
    topInstanceOf: (permanentId) => tops.get(permanentId),
  };
}

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
          step.track !== SECURITY_DOCK_TRACK && step.track !== SECURITY_HOLD_TRACK && step.blocksDecision !== false,
      ),
    );
    setQueueActivity((count) => count + 1);
  };
  // Assigned on every render so the queue's bookkeeping always reaches the current setter.
  publishPresentedRef.current = () => setPresentedStateVersion(progress.current());

  const [narration, setNarration] = useState<ReadonlyMap<string, NarrationItem>>(new Map());
  const [rejection, setRejection] = useState<MatchNotice | null>(null);
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
  const [heldBlowState, setHeldBlowState] = useState<GameState | undefined>();
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
  // The revealed card currently held on stage by a check the server has not closed yet.
  // `securityRevealed` stages it and `securityChecked` settles it, which may be a decision
  // or two later — everything in between is that card's consequence and queues behind it.
  const revealOnStageRef = useRef<{
    key: number;
    scene: SecurityClashScene;
    /** True once the card has played out and left the centre of the screen on its own. */
    exited?: boolean;
    /** True while the card is parked in the side dock waiting for its check to close. */
    docked?: boolean;
  } | null>(null);
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
  const unsuspendSweepKeyRef = useRef(0);
  const showcaseKeyRef = useRef(0);
  const phaseBannerKeyRef = useRef(0);
  const dpPulseKeyRef = useRef(0);
  const freezePulseKeyRef = useRef(0);
  const effectSourceKeyRef = useRef(0);
  const optionDockKeyRef = useRef(0);
  const deletionReadyAtRef = useRef(
    new Map<string, { readyAt: number; instanceId?: string; shattered?: PresentationGate }>(),
  );
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

  /**
   * The figure this seat's shield is showing right now. Read as a scene is staged, which
   * is normally before the patch that removes the card has even landed — the server sends
   * events as they happen and patches on its own tick — so it is the figure that still
   * counts the card the scene is about to spend.
   */
  function securityCountOf(seat: Seat): number | undefined {
    return state?.players[seat]?.securityCount;
  }

  /** Keep this seat's shield on `count` until the scene `key` has shown the card leaving. */
  function holdSecurityCard(key: number, seat: Seat, count: number | undefined) {
    if (count === undefined) return;
    setHeldSecurityCards((held) => new Map(held).set(key, { seat, count }));
  }

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

  /**
   * A scene the queue drops before it ever starts — a newer check replacing the track —
   * runs no `finally`, and its hold would keep a card on the shield for the rest of the
   * match. Whatever it was holding is given back at the latest when nothing is running.
   * Call after the scene's steps are enqueued, or the queue is idle at that instant and
   * the figure is handed back before the scene has shown anything.
   */
  function releaseSecurityCardWhenIdle(key: number) {
    void queue.idle().then(() => releaseSecurityCard(key));
  }

  /** The card has been seen to go, so the shield catches up with the board. */
  function releaseSecurityCard(key: number) {
    setHeldSecurityCards((held) => {
      if (!held.has(key)) return held;
      const next = new Map(held);
      next.delete(key);
      return next;
    });
  }

  /**
   * The item as it will be shown, or null when there is nothing left of it.
   *
   * A clause whose own decision dialog has opened since the item was queued is dropped
   * here rather than read out beside a dialog printing the same words; the panel it
   * travelled with, which the dialog does not repeat, stays.
   */
  function presentableNarration(item: NarrationItem): NarrationItem | null {
    const { notice } = item;
    // The folded slot reads slower than the board does, so its items get a longer clock.
    const shown = (presented: NarrationItem): NarrationItem => ({
      ...presented,
      ...(collapseNarrationRef.current
        ? { lifetimeMs: Math.round(narrationReadingTime(presented) * TOUCH_NARRATION_LIFETIME_SCALE) }
        : {}),
      createdAt: Date.now(),
    });
    const suppressed =
      notice !== undefined && [...suppressedOwnEffectsRef.current].some((cardId) => isOwnEffectNotice(notice, cardId));
    if (!suppressed) return shown(item);
    if (!item.panel) return null;
    return shown({ ...item, notice: undefined });
  }

  const effectNarrationTracksRef = useRef(new Map<Seat, string>());
  const effectAnnounceGateRef = useRef<PresentationGate | null>(null);
  const causingEffectGateRef = useRef<PresentationGate | null>(null);

  /** Publish the clause before the results queued behind its arrival. */
  function enqueueNarrationItem(item: NarrationItem, effectSourceHoldMs: number = TIMINGS.effectSourceHold) {
    const body = item.notice?.body;
    const seat = item.side === "you" ? viewerSeat : otherSeat(viewerSeat);
    const initialSite = body?.variant === "effect" ? cardSiteRef.current.locate(body.cardId, seat, body) : undefined;
    const timing = body?.variant === "effect" ? (body.timing ?? "") : "";
    // Follow the actual arrival track, including its field burst, rather than
    // estimating when a normal play or evolution will be finished.
    const onPlay = /on.?play/i.test(timing) && initialSite?.zone === "field";
    const arrivalTrack =
      /on.?play|when.?digivolving/i.test(timing) && initialSite?.zone === "field"
        ? onPlay
          ? CENTER_STAGE_TRACK
          : `burst-${initialSite.permanentId}`
        : undefined;
    const causingEffectGate = effectAnnounceGateRef.current;
    const announceGate = body?.variant === "effect" ? createPresentationGate() : null;
    if (announceGate) effectAnnounceGateRef.current = announceGate;
    if (arrivalTrack) effectNarrationTracksRef.current.set(seat, arrivalTrack);
    const precedingTrack = effectNarrationTracksRef.current.get(seat);
    const track =
      arrivalTrack ??
      (precedingTrack && queue.hasPendingStep((step) => step.track === precedingTrack) ? precedingTrack : "narration");
    const heldOrigin = heldOriginsRef.current.get(item.notice ?? item.panel ?? item);
    const origin = {
      phaseOrder: heldOrigin?.phaseOrder ?? enqueuePhaseOrderRef.current,
      batchId: item.batchId,
      stateVersion: heldOrigin?.stateVersion ?? batchVersionsRef.current.get(item.batchId) ?? 0,
      ...(body?.variant === "effect" ? { sourceCardId: body.cardId, timing: body.timing } : {}),
    };
    // Which phase raised the clause is what lets the ribbon that follows it wait for its
    // beat and then clear it (`waitForPhasePrerequisites`).
    narrationPhaseOrdersRef.current.set(item.id, origin.phaseOrder ?? completedPhaseOrderRef.current);
    function reportShown(stepId: string, context: AnimationStepContext) {
      try {
        presentationReporterRef.current?.({
          ...origin,
          phase: "shown",
          stepId,
          track,
          clientTimestamp: Date.now(),
          mode: context.mode,
          cancelled: context.cancelled,
          skipping: context.skipping,
          failed: false,
          pendingCount: queue.pendingCount(),
        });
      } catch {
        // Diagnostic transport must never interrupt the presentation.
      }
    }
    queue.enqueue({
      id: `narration-step-${item.id}`,
      origin,
      track,
      holdsBoard: false,
      blocksDecision: false,
      async run(context) {
        /* The source card is lit before its clause and stays lit until the clause leaves
           (`pruneEffectSources`). A run that ends before the clause is ever published —
           cancelled, skipped, or nothing presentable left — owns the light it turned on,
           because no clause will arrive for the prune to follow. */
        let activation: EffectActivation | undefined;
        let linked = false;
        try {
          await runNarrationStep();
        } finally {
          announceGate?.release();
          if (activation && !linked) {
            const key = activation.key;
            setEffectSources((sources) => sources.filter((source) => source.key !== key));
          }
        }

        async function runNarrationStep() {
          if (context.mode === "replay" || narrationSkipRef.current) return;
          await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS);
          if (context.cancelled || narrationSkipRef.current) return;
          if (onPlay && initialSite?.zone === "field") {
            while (
              queue.hasPendingStep((step) => step.track === `burst-${initialSite.permanentId}`) &&
              context.mode === "live" &&
              !context.cancelled &&
              !context.skipping
            )
              await context.wait(16);
          }
          if (context.mode === "live" && body?.variant === "effect") {
            // Let this batch register its deletion beats before locating the source.
            await Promise.resolve();
            const shatter = deletionReadyAtRef.current.get(`${seat}:${body.cardId}`);
            if (shatter) {
              await waitForGate(shatter.shattered, context, TIMINGS.securityDockMax);
              await context.wait(Math.max(0, shatter.readyAt - Date.now()));
            }
            if (context.cancelled || narrationSkipRef.current) return;
            const deletion = /on.?deletion/i.test(body.timing ?? "")
              ? deletionReadyAtRef.current.get(`${seat}:${body.cardId}`)
              : undefined;
            const site = deletion?.instanceId
              ? { zone: "trash" as const, instanceId: deletion.instanceId }
              : cardSiteRef.current.locate(body.cardId, seat, body);
            if (site && context.mode === "live") {
              activation = {
                key: ++effectSourceKeyRef.current,
                cardId: body.cardId,
                seat,
                site,
                itemId: item.id,
              };
              setEffectSources((sources) => [...sources, activation as EffectActivation]);
              reportShown(`effect-source-${activation.key}`, context);
              // The punch this card earns on its own, ahead of the clause it raised.
              await context.wait(effectSourceHoldMs);
            }
          }
          if (context.cancelled || narrationSkipRef.current) return;
          const shown = presentableNarration(item);
          if (!shown) return;
          const push = (published: NarrationItem) =>
            setNarration((items) =>
              pushNarrationItem(
                items,
                published,
                collapseNarrationRef.current ? COLLAPSED_NARRATION_LIMIT : narrationLimitRef.current,
                collapseNarrationRef.current,
              ),
            );
          // Left, then right. A moment carrying both halves is a sentence and its result, so
          // the clause takes the screen first and the cards it moved follow a beat later.
          // The folded phone slot draws both halves in one item, so it is published whole.
          const staggered = !collapseNarrationRef.current && shown.notice !== undefined && shown.panel !== undefined;
          if (staggered) {
            const { panel: _panel, ...clauseOnly } = shown;
            push(clauseOnly);
            await context.wait(TIMINGS.narrationCardsLag);
            if (context.cancelled || narrationSkipRef.current) return;
          }
          push(shown);
          if (activation) {
            const key = activation.key;
            linked = true;
            setEffectSources((sources) =>
              sources.map((source) => (source.key === key ? { ...source, linked: true } : source)),
            );
          }
          announceGate?.release();
          reportShown(`narration-step-${item.id}`, context);
          // A narration column is a FIFO, not a latest-event ticker. Where the column holds a
          // single moment, give every clause one readable beat before the next server event
          // can replace it; a column with room shows a batch together instead.
          if (shown.notice && narrationLimitRef.current === 1) await context.wait(TIMINGS.effectAnnounce);
        }
      },
    });
    if (announceGate) void queue.idle().then(() => announceGate.release());
  }

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
   * Queues one moment's worth of narration: the panels and the notices the same beat
   * raised, folded into as few items as they honestly make (narration.ts).
   */
  function narrate(
    notices: readonly MatchNotice[],
    panels: readonly SidePanel[],
    batchId: string,
    effectSourceHoldMs: number = TIMINGS.effectSourceHold,
  ) {
    if (notices.length === 0 && panels.length === 0) return;
    const items = buildNarrationItems({
      batchId,
      notices,
      panels,
      nowMs: Date.now(),
      nextId: () => `narration-${(narrationSequenceRef.current += 1)}`,
    });
    for (const item of items) enqueueNarrationItem(item, effectSourceHoldMs);
  }

  /** Raises whatever a security check has still not said, on the clock it is raised at. */
  function flushHeldNotices() {
    openHeld(heldNoticesRef.current, heldPanelsRef.current);
  }

  /**
   * Raises exactly these, on the clock they are raised at, and takes them out of the held
   * buckets. Targeted rather than draining: a check is presented in several cues — the dock,
   * the arrival of a card it played, what that card then did — and each cue must say its own
   * part only. Draining let the dock read out an [On Play] result that had not happened on
   * screen yet, because a later batch had parked it in the same bucket.
   */
  function openHeld(ownNotices: readonly MatchNotice[], ownPanels: readonly SidePanel[]) {
    if (ownNotices.length === 0 && ownPanels.length === 0) return;
    heldNoticesRef.current = heldNoticesRef.current.filter((held) => !ownNotices.includes(held));
    heldPanelsRef.current = heldPanelsRef.current.filter((held) => !ownPanels.includes(held));
    const origins = new Set(
      [...ownNotices, ...ownPanels].map((item) => heldOriginsRef.current.get(item)?.batchId ?? lastBatchIdRef.current),
    );
    for (const batchId of origins) {
      narrate(
        ownNotices.filter((item) => (heldOriginsRef.current.get(item)?.batchId ?? lastBatchIdRef.current) === batchId),
        ownPanels.filter((item) => (heldOriginsRef.current.get(item)?.batchId ?? lastBatchIdRef.current) === batchId),
        batchId,
      );
    }
  }

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
    causingEffectGateRef.current = effectAnnounceGateRef.current;
    lastBatchIdRef.current = batchId;
    // Everything enqueued from here belongs to this batch, and the board it is narrated
    // over is the board this batch produced.
    presentationBatchRef.current = { batchId, stateVersion };
    batchVersionsRef.current.set(batchId, stateVersion);
    if (batchVersionsRef.current.size > 120)
      batchVersionsRef.current.delete(batchVersionsRef.current.keys().next().value!);
    if (!replayingHistory && !continuingBatch) progress.present(batchId, stateVersion);
    const refusal = [...fresh].reverse().find((event) => event.kind === "actionRejected");
    // Each segment carries one check, its opening, or its close. A decision inside a
    // [Security] effect can still split that check across server batches.
    const revealIndex = lastIndexOfKind(fresh, "securityRevealed");
    const checkIndex = lastIndexOfKind(fresh, "securityChecked");
    const securityReveal = revealIndex >= 0 ? fresh[revealIndex] : undefined;
    /** True when this batch's last close belongs to this batch's last reveal. */
    const closesFreshReveal = revealIndex >= 0 && checkIndex > revealIndex;
    // A close that precedes the batch's last reveal belongs to a card the newer reveal has
    // already taken off the stage, so it is dropped with the scene it closed.
    const securityCheck = checkIndex >= 0 && (revealIndex < 0 || closesFreshReveal) ? fresh[checkIndex] : undefined;
    const closingCheck = closesFreshReveal && securityCheck?.kind === "securityChecked" ? securityCheck : undefined;
    const turnEnd = [...fresh].reverse().find((event) => event.kind === "turnEnded");
    const securityAttack = [...fresh]
      .reverse()
      .find((event) => event.kind === "attackDeclared" && event.target.kind === "player");
    /**
     * An attack owns the screen for its call-out, the way a played card owns it for its
     * showcase. A [When Attacking] clause resolves in the same batch as the declaration that
     * fired it, so with no lead-in its draw and its toast land on the very frame of the lunge
     * — the clause going off before the attack that triggered it has been read. It waits the
     * same beat `attackAnnounce` gives the call-out, for the same reason `effectAnnounce`
     * gives one to an [On Play].
     */
    const attackLeadInMs = fresh.some((event) => event.kind === "attackDeclared") ? TIMINGS.attackAnnounce : 0;
    /**
     * A redirect that moves the attack off the player (＜Raid＞, a Counter effect) leaves the
     * lunge the declaration already played as the whole of what security gets: the battle is
     * a field clash now. The attacker remembered for the centre-stage check has to be dropped
     * with it, or the next check on this seat opens with the wrong card.
     */
    const redirectedOffPlayer = [...fresh]
      .reverse()
      .find((event) => event.kind === "attackDeclared" && event.redirected === true && event.target.kind !== "player");
    // Replayed steps still run, so their state lands in the right place — they
    // just run with every wait collapsed, which is no animation at all.
    const batchPhaseOrder = enqueuePhaseOrderRef.current;
    const enqueue = (step: AnimationStep) =>
      queue.enqueue({
        ...step,
        origin: { batchId, stateVersion, phaseOrder: batchPhaseOrder },
        ...(replayingHistory ? { mode: "replay" as const } : {}),
      });
    const usedOption = fresh.find(
      (event) =>
        event.kind === "cardPlayed" &&
        event.permanentId === undefined &&
        (() => {
          const definition = getCardDefinition(event.cardId);
          return definition !== undefined && isOption(definition);
        })(),
    );
    const optionRouted = fresh.some((event) => event.kind === "cardsMoved" && event.optionUsed === true);
    if (optionRouted && optionDockRef.current) optionDockRef.current.closed = true;
    // A permanent that lost a battle takes the claw and the shake first, and its
    // burst waits behind them — the reference client hits the card, then breaks
    // it. Only combat deletions get the impact; an effect deletion has no blow
    // to land. A battle whose defender is known plays the whole scene — arrow,
    // lunge, then the blow — so its losers wait on the longer clock.
    const beaten = new Set<string>();
    const clashScenes: FieldClashScene[] = [];
    const clashLoserIds = new Set<string>();
    for (const event of fresh) {
      if (event.kind === "combatResolved") {
        const scene = buildFieldClashScene({
          key: (fieldClashKeyRef.current += 1),
          open: openAttackRef.current,
          event,
          viewerSeat,
          cardIdOf: (permanentId) => anchors.permanentCardId?.(permanentId),
          artIdOf: (permanentId) => lastVisibleArtRef.current.get(permanentId),
        });
        if (scene) {
          clashScenes.push(scene);
          for (const permanentId of event.deletedPermanentIds) clashLoserIds.add(permanentId);
        } else {
          for (const permanentId of event.deletedPermanentIds) beaten.add(permanentId);
        }
      }
      openAttackRef.current = trackOpenAttack(openAttackRef.current, event);
    }
    /**
     * How long the battle owns the screen before anything it caused may be narrated.
     *
     * The server holds `combatResolved` until the attack reaches its end-of-attack seam,
     * so a batch carries the battle's consequences — the deletion triggers, the effects
     * they fire — ahead of the event the scene is cut from. Playing those at once would
     * read as the effects firing first and the two cards fighting afterwards, over a
     * board the loser has already left. The battle plays out first instead, and the cues
     * that explain it wait for the blow to land.
     */
    const combatLeadInMs = clashScenes.length > 0 ? FIELD_CLASH_TOTAL_MS : 0;
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
        setPendingPermanentIds((held) => ids.reduce((next, id) => remove(next, id), held));
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
        track: CENTER_STAGE_TRACK,
        skippable: false,
        run() {
          narrate(arrivalNotices, arrivalPanels, batchId);
        },
      });
    }

    if (!replayingHistory) {
      for (const event of fresh) {
        const cue = soundForEvent(event, viewerSeat);
        if (cue && event.kind !== "turnEnded")
          enqueue({ id: `sound-${batchId}-${event.kind}`, track: "sound", run: () => playCue(cue) });
      }
      const now = Date.now();
      let announcement: AttackAnnouncement | null = null;
      const opened: SidePanel[] = [];
      const raised: MatchNotice[] = [];
      // Which event each panel and each notice came from. The server delivers a whole
      // `[Security]` resolution in ONE batch — the reveal, the free play it grants and the
      // [On Play] reveals that follow are all `fresh` together — so "before the card was
      // played" and "after it was played" is a position in this array, not a batch boundary.
      const panelAt: number[] = [];
      const noticeAt: number[] = [];
      // The centre-stage showcase runs only in `live` mode, so under reduced motion or a
      // hidden tab the panel is the only thing left to announce an opponent's arrival.
      const showcasePlays = queue.getMode() === "live";
      /* The card a check is currently holding on screen. A `[Security]` clause that plays
         its own card raises the ordinary "played card" panel, which under reduced motion or
         a hidden tab is the only announcement a play gets — but here it is not: the dock is
         holding that exact card up, so the panel would name it twice, in the column the
         [On Play] result needs. */
      const dockedCardId =
        securityReveal?.kind === "securityRevealed"
          ? securityReveal.revealedCardId
          : revealOnStageRef.current?.scene.revealed.cardId;
      for (const [eventIndex, event] of fresh.entries()) {
        if (event.kind === "digivolved") pendingDigivolutionDrawRef.current.add(event.seat);
        if (event.kind === "cardsMoved" && event.from === "deck" && event.to === "hand") {
          const seat =
            event.seat ??
            event.instanceIds.map((id) => sidePanelLookupRef.current.seat(id)).find((owner) => owner !== undefined);
          if (seat !== undefined) {
            const side = seat === viewerSeat ? "you" : "opp";
            eventDrawCountsRef.current[side] = state?.players[seat]?.handCount;
            const followsDigivolution =
              event.drawReason === "digivolution" && pendingDigivolutionDrawRef.current.has(seat);
            const waitBeforeMs = followsDigivolution ? CARD_BURST_PEAK_MS : attackLeadInMs;
            // One flight per card. The server names a whole Draw 2 in a single event, so a
            // flight per event sent one card back for two cards and read as a single draw.
            for (const [drawIndex] of event.instanceIds.entries())
              launchDrawFlight(side, false, waitBeforeMs + drawIndex * TIMINGS.drawFlightStagger);
            /**
             * An effect draw by the held seat releases that seat's draw-phase hold.
             *
             * The hold freezes the presented hand at the previous revision so the draw the
             * turn opens with stays hidden until its Draw banner. Only the phase draw needs
             * hiding, and that one moves through GameEngine.drawCards and emits no event at
             * all: reaching this line means the cards came from an effect, and belong on
             * screen now.
             *
             * The seat matters. A turn that flips in the same patch that carried the
             * PREVIOUS player's last effect arms the hold for the incoming seat before this
             * batch is read; releasing it here on the outgoing seat's draw let the incoming
             * seat's turn-start draw fly ribbons ahead of its own Draw banner.
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
        // A security card that resolves an effect owns the next notice, which is
        // why the flag is read here rather than derived from the event alone.
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
                  effectNoticeFromEvent(event, viewerSeat, noticeId, now, securityEffectPendingRef.current) ??
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
      // Zone changes own the centre of the screen: the opponent's card is held
      // up, the destination stays hidden behind it, and only then does the
      // permanent reveal on its burst. The viewer's own moves keep the burst and
      // skip the hold — they watched the card leave their own hand.
      //
      // A batch that also opens a security check is the exception. The check takes the
      // centre of the screen with `replace`, so a zone change enqueued ahead of it is
      // cancelled before it draws a frame — which is why a card played BY a [Security]
      // effect used to appear on the field with no arrival at all. Those steps are
      // collected instead and enqueued after the reveal has been staged, so the card is
      // seen arriving once the reveal has finished with the screen.
      let arriving = false;
      let showcased = false;
      const zoneChanges: AnimationStep[] = [];
      /** The first event that puts a card on the field, which is what the check's play is. */
      let firstArrivalIndex = fresh.length;
      /* A named-mechanic call-out belongs WITH the card it names. "DigiXros!" printed after
         the showcase reads as a caption for whatever came next — which, when the Xrosed card
         has an [On Play] that deletes, is the board emptying. So it is raised as the card
         goes centre-stage and shares that beat, and everything else the batch raised waits
         until the showcase is over. A security check owns its own ordering (below) and is
         left alone. */
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
            track: CENTER_STAGE_TRACK,
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
        const playsItself =
          event.kind === "cardPlayed" && event.cardId === revealOnStageRef.current?.scene.revealed.cardId;
        const blocked =
          securityBlowRef.current !== null && !securityBlowRef.current.landed && !securityReveal && !playsItself;
        const step = zoneChangeStep(key, blocked ? null : showcase, burst, leadInMs);
        if (securityReveal) zoneChanges.push(step);
        else enqueue(step);
        // The board renders a permanent the moment its patch lands, so a card whose
        // arrival is still queued has to be held back from the field until the cue
        // that shows it arriving actually runs — otherwise it is simply there.
        // A player normally watches their own card leave their hand, so only an opponent's
        // play earns the centre-screen hold. A Tamer played from the viewer's Security is
        // different: the player has not seen it arrive yet, and it must stay hidden until
        // the security card has reached its right-hand execution slot.
        if (burst && (showcase || securityReveal !== undefined || revealOnStageRef.current !== null)) {
          arrivalHoldIds.push(burst.permanentId);
          setPendingPermanentIds((held) => new Set(held).add(burst.permanentId));
        }
      }
      // A step a later `replace` drops never runs its own release, and a permanent hidden
      // for good is far worse than one that arrives without its cue, so the board takes
      // every held card back at the latest when nothing is running. Registered after the
      // steps are enqueued: on an idle queue the promise settles at once.
      if (securityReveal === undefined) releaseArrivalHoldsWhenIdle();
      // The activation moment plays where the effect came from: a permanent glows
      // in place, a card in the trash flies out of the pile, an Option rises out
      // of the hand fan.
      for (const event of fresh) {
        effectSourceKeyRef.current += 1;
        // The used Option already has the more legible dock presentation below. Do not
        // also make its final trash position look like the source of its own [Main].
        if (
          usedOption?.kind === "cardPlayed" &&
          event.kind === "effectActivated" &&
          event.sourceCardId === usedOption.cardId
        )
          continue;
        const activation = effectActivationFromEvent(event, effectSourceKeyRef.current, cardSiteRef.current.locate);
        if (!activation) continue;
        enqueue({
          id: `effect-source-${activation.key}`,
          track: effectActivationTrack(activation),
          replace: true,
          async run(context) {
            if (context.mode !== "live") return;
            await context.wait(combatLeadInMs);
            if (context.cancelled) return;
            try {
              setEffectSources((sources) => [...sources, activation]);
              await context.wait(TIMINGS.effectSourceHold);
            } finally {
              setEffectSources((sources) => sources.filter((candidate) => candidate.key !== activation.key));
            }
          },
        });
      }
      // The server names each deck it randomizes, which is the moment the reference
      // client riffles that pile.
      for (const event of fresh) {
        deckRiffleKeyRef.current += 1;
        const riffle = deckRiffleFromEvent(event, deckRiffleKeyRef.current);
        if (!riffle) continue;
        enqueue(deckRiffleStep(riffle));
      }
      // A claim is good for the patch that follows the batch it was made in. One that
      // never met a growth — the stack lost a card in the same patch it gained one — is
      // stale by the next batch, and must not swallow a growth that batch leaves to the
      // count watcher.
      securityGrowthClaimedRef.current.clear();
      // A card an effect stacked lands with the same bounce a recovery plays. The event
      // names the seat, so the notice is its own (see `securityGainNoticeFromEvent`) and
      // the growth is claimed ahead of the count watcher.
      for (const event of fresh) {
        if (event.kind !== "cardsMoved" || event.to !== "security" || event.seat === undefined) continue;
        if (event.instanceIds.length === 0) continue;
        securityGrowthClaimedRef.current.add(event.seat);
        launchSecurityGainFlight(event.seat);
      }
      // A recovered card flies back onto the stack it joined.
      for (const event of fresh) {
        if (event.kind !== "securityRecovered") continue;
        const seat = event.seat;
        // The count watcher below will see this growth too; the flight and notice
        // are this event's to play, so the growth is claimed here.
        securityGrowthClaimedRef.current.add(seat);
        enqueue({
          id: `security-flight-${seat}-${event.amount}`,
          track: `securityFlight-${seat}`,
          replace: true,
          async run(context) {
            if (context.mode !== "live") return;
            try {
              setSecurityFlights((seats) => new Set(seats).add(seat));
              await context.wait(TIMINGS.securityFlight);
            } finally {
              setSecurityFlights((seats) => {
                if (!seats.has(seat)) return seats;
                const next = new Set(seats);
                next.delete(seat);
                return next;
              });
            }
          },
        });
      }
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
      if (usedOption?.kind === "cardPlayed") {
        optionDockKeyRef.current += 1;
        const key = optionDockKeyRef.current;
        const dock: SecurityBranchScene = {
          key,
          cardId: usedOption.cardId,
          ...(usedOption.artId ? { artId: usedOption.artId } : {}),
          side: usedOption.seat === viewerSeat ? "you" : "opp",
          state: "docked",
          source: "option",
        };
        optionDockRef.current = { key, closed: optionRouted };
        enqueue({
          id: `option-dock-in-${key}`,
          track: OPTION_DOCK_TRACK,
          skippable: false,
          // The dock's own entrance is part of that same wait (see the hold below).
          blocksDecision: false,
          async run(context) {
            setOptionBranch(dock);
            await context.wait(SECURITY_BRANCH_IN_MS);
          },
        });
        enqueue({
          id: `option-dock-hold-${key}`,
          track: OPTION_DOCK_HOLD_TRACK,
          skippable: false,
          // Same reason the security dock is excluded from the decision barrier: this hold
          // waits for the docked Option to finish, and the Option finishes by the viewer
          // ANSWERING its decision. Blocking the decision on it deadlocks both.
          blocksDecision: false,
          async run(context) {
            // Keep even a one-batch Option long enough for its activated effects to read.
            let waitedMs = 0;
            while (!context.cancelled && waitedMs < TIMINGS.optionDockHold) {
              await context.wait(TIMINGS.securityDockPoll);
              waitedMs += TIMINGS.securityDockPoll;
            }
            // The routing marker says the card left its no-area slot, which for a plain Option
            // is the end of its resolution. An Option that relocates ITSELF mid-clause (placing
            // itself as a security card, onto the field) is marked at that placement and goes on
            // resolving, so the marker alone would pull the card off screen while the viewer is
            // still answering prompts about it. The dock exists to keep it readable through
            // exactly those prompts, so an open decision holds it too — under the same ceiling.
            while (
              !context.cancelled &&
              (!optionDockRef.current?.closed || decisionPendingRef.current) &&
              waitedMs < TIMINGS.securityDockMax
            ) {
              await context.wait(TIMINGS.securityDockPoll);
              waitedMs += TIMINGS.securityDockPoll;
            }
            if (optionDockRef.current?.key === key) optionDockRef.current = null;
            setOptionBranch((current) => (current?.key === key ? { ...current, state: "closing" } : current));
            await context.wait(SECURITY_DOCK_CLOSE_MS);
            setOptionBranch((current) => (current?.key === key ? null : current));
          },
        });
      }
      if (securityReveal) {
        deferredZoneChanges = zoneChanges;
        // Split at the play. What the revealed card itself did — its `[Security]` clause —
        // reads beside it as soon as it is on screen; what the card it PLAYED went on to do
        // waits for that card to be seen arriving on the field.
        heldNotices = raised.filter((_, index) => noticeAt[index]! < firstArrivalIndex);
        heldPanels = opened.filter((_, index) => panelAt[index]! < firstArrivalIndex);
        afterArrivalNotices = raised.filter((_, index) => noticeAt[index]! >= firstArrivalIndex);
        afterArrivalPanels = opened.filter((_, index) => panelAt[index]! >= firstArrivalIndex);
      } else if (revealOnStageRef.current !== null && presenting) {
        // A reveal from an earlier batch is still holding the centre of the screen, either
        // mid-clash or parked in its dock. These are that check's consequences, so they
        // queue behind the reveal on its own track rather than talking over it — behind the
        // dock's arrival, and behind the card-enter cue this same batch enqueued above.
        noticeSequenceRef.current += 1;
        const id = `security-notices-late-${noticeSequenceRef.current}`;
        heldNoticesRef.current = [...heldNoticesRef.current, ...raised];
        heldPanelsRef.current = [...heldPanelsRef.current, ...opened];
        const lateNotices = raised;
        const latePanels = opened;
        enqueue({
          id,
          track: CENTER_STAGE_TRACK,
          skippable: false,
          run() {
            openHeld(lateNotices, latePanels);
          },
        });
      } else if (arriving && presenting) {
        const heldForShowcase = showcased ? afterShowcaseNotices : raised;
        const panelsForShowcase = opened;
        const deletesFromField = fresh.some(
          (event) => event.kind === "cardsMoved" && (event.deletedPermanents?.length ?? 0) > 0,
        );
        // The clause the played card triggered gets the beat after the showcase to itself:
        // it is read out, and only then does what it did reach the board. A deletion keeps
        // the final 200 ms of the source glow under the toast, then breaks immediately.
        const clauseRead = heldForShowcase.some((notice) => notice.body.variant === "effect");
        const effectSourceHoldMs = deletesFromField
          ? TIMINGS.effectSourceHold - TIMINGS.noticeIn
          : TIMINGS.effectSourceHold;
        playLeadInMs = showcasePlays
          ? (showcased ? SHOWCASE_TOTAL_MS : 0) +
            (clauseRead ? (deletesFromField ? TIMINGS.effectSourceHold : TIMINGS.effectAnnounce) : 0)
          : 0;
        enqueue({
          id: `showcase-notices-${showcaseKeyRef.current}`,
          track: CENTER_STAGE_TRACK,
          skippable: false,
          run() {
            narrate(heldForShowcase, panelsForShowcase, batchId, effectSourceHoldMs);
          },
        });
        // The prompt this play is about to raise waits behind the same beats through the
        // decision barrier, which holds it until the presentation has reached the board the
        // question is about instead of counting a wall clock (Phase 3).
      } else if (combatLeadInMs > 0 && presenting) {
        // These read as what the battle caused, so they are raised once the blow has
        // landed. Their clock starts there too, not at the batch that carried them.
        noticeSequenceRef.current += 1;
        const id = `combat-notices-${noticeSequenceRef.current}`;
        const held = raised;
        const heldForCombat = opened;
        enqueue({
          id,
          track: "combatNotices",
          // The wait belongs to the battle, so a skip — or a screen with no animation to
          // watch — collapses it and the notices read at once.
          async run(context) {
            await context.wait(combatLeadInMs);
            if (context.cancelled) return;
            narrate(held, heldForCombat, batchId);
          },
        });
      } else {
        narrate(raised, opened, batchId);
      }
      if (announcement) {
        const shown = announcement;
        enqueue({
          id: `attack-announce-${shown.id}`,
          track: "attackAnnounce",
          replace: true,
          skippable: false,
          async run(context) {
            setAttackAnnouncement(shown);
            await context.wait(TIMINGS.attackAnnounce);
            if (context.cancelled) return;
            setAttackAnnouncement(null);
          },
        });
      }
    }
    if (refusal?.kind === "actionRejected") onActionRejected(refusal.reason);
    if (securityAttack?.kind === "attackDeclared") {
      const lunge: AttackLunge = {
        permanentId: securityAttack.attackerPermanentId,
        direction: securityAttack.seat === viewerSeat ? "up" : "down",
      };
      enqueue({
        id: `lunge-${lunge.permanentId}`,
        track: "attackLunge",
        replace: true,
        async run(context) {
          setAttackLunge(lunge);
          await context.wait(TIMINGS.attackLunge);
          if (context.cancelled) return;
          setAttackLunge(null);
        },
      });
      securityAttackerRef.current = {
        seat: securityAttack.seat,
        cardId: securityAttack.attackerCardId,
        artId: securityAttack.attackerArtId,
        permanentId: securityAttack.attackerPermanentId,
        // Captured while the attacker is still on the field: an effect deletion names
        // the card instance rather than the permanent, so both ways in are kept.
        topInstanceId: cardSiteRef.current.topInstanceOf(securityAttack.attackerPermanentId),
      };
    }
    if (
      redirectedOffPlayer?.kind === "attackDeclared" &&
      securityAttackerRef.current?.permanentId === redirectedOffPlayer.attackerPermanentId
    ) {
      securityAttackerRef.current = undefined;
    }
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
    function stageSecurityReveal(
      key: number,
      scene: SecurityClashScene,
      seat: Seat,
      { docking = false }: { docking?: boolean } = {},
    ) {
      // Only an unfinished check may be replaced. Completed checks still owed to the
      // viewer stay on the serial track, even when their events arrived in one render.
      const replace = revealOnStageRef.current !== null || queuedSecurityKeyRef.current === null;
      if (revealOnStageRef.current !== null) flushHeldNotices();
      queuedSecurityKeyRef.current = key;
      // Armed with the reveal and released by the outcome, so anything this check deletes
      // in between waits for the blow instead of shattering over a battle not yet drawn.
      securityBlowRef.current = { key, landed: false, gate: createPresentationGate() };
      // The board as it is at the reveal — attacker suspended on the field, cards still in
      // security — is what stays on screen until that battle has been drawn. Snapshotted
      // here rather than taken from `previousDrawStateRef`, which lags a render: that copy
      // predates the declaration, so the attacker it carries stands unsuspended and the
      // board would answer the blow by rotating the dying card upright.
      setHeldBlowState(state ? snapshotGameState(state) : undefined);
      // A dock belongs to the check that opened it. Its hold no longer shares a track with
      // the reveal, so a newer check has to retire it by hand rather than by replacement.
      const stale = securityDockRef.current;
      if (stale && stale.key !== key) {
        securityDockRef.current = null;
        setSecurityBranch((current) => (current?.key === stale.key ? null : current));
      }
      // A battle hold is bounded the same way, and for the same reason: it no longer shares
      // a track with the reveal, so a newer check has to retire it by hand.
      const staleHold = securityHoldRef.current;
      if (staleHold && staleHold.key !== key) {
        securityHoldRef.current = null;
        setSecurityClash((current) => (current?.key === staleHold.key ? null : current));
      }
      // The board drops the checked card as soon as its patch lands; the shield keeps the
      // figure that still counts it until the reveal has actually put the card on screen.
      holdSecurityCard(key, seat, securityCountOf(seat));
      enqueue(
        shieldBreakStep(buildSecurityBreakScene({ key, defenderSeat: seat, viewerSeat }), {
          replace,
          ...(replayingHistory ? {} : { clausesBefore: batchId }),
        }),
      );
      void queue.idle().then(() => {
        if (queuedSecurityKeyRef.current === key) queuedSecurityKeyRef.current = null;
      });
      // Everything the check will present is held back from here until the reveal has
      // been seen. Cleared by the presentation step, and by the queue going idle in
      // case a newer cue took the centre of the screen before the scene got there.
      if (!replayingHistory) setPendingRevealKey(key);
      // The scene is two steps, not one, so a click through it collapses the half
      // that is only spectacle. Up to the outcome the cards have to stay legible,
      // motion preference or not; the blow, the shatter and the fade after it are
      // decoration the board can be taken back from at any time.
      enqueue({
        id: `security-clash-${key}`,
        track: CENTER_STAGE_TRACK,
        skippable: false,
        async run(context) {
          try {
            setSecurityClash(scene);
            await context.wait(CLASH_REVEAL_SHOWN_AT_MS);
            // The card is out of the stack and on the screen, so the shield may drop.
            releaseSecurityCard(scene.key);
            // Every reveal holds for the same beat, whatever follows it.
            await context.wait(CLASH_DOCK_AT_MS - CLASH_REVEAL_SHOWN_AT_MS);
            if (!docking) return;
            // A card that has a [Security] effect to resolve leaves the centre for its
            // dock rather than holding the middle of the board through a resolution
            // that takes as long as the server needs. It fades out first, so the dock's
            // slide-in starts on a board it has already left.
            setSecurityClash((current) => (current?.key === scene.key ? { ...current, departing: true } : current));
            await context.wait(TIMINGS.clashExit);
          } finally {
            // A cancelled scene must not leave a card the shield keeps counting for good.
            releaseSecurityCard(scene.key);
            if (context.cancelled || docking)
              setSecurityClash((current) => (current?.key === scene.key ? null : current));
          }
        },
      });
      releaseSecurityCardWhenIdle(key);
    }

    /**
     * Parks the revealed card at the side of the screen and LEAVES it there. The reference
     * client docks a card with a `[Security]` effect in its brainstorm slot and resolves the
     * effect — every target pick, every optional yes/no — with the card still on screen,
     * closing the slot only once the card is disposed (`CardController.cs:4062-4232`).
     *
     * The dock is therefore open-ended, and the centre-stage track is serial, so it is
     * bounded in every direction it can be: it ends on the matching `securityChecked`, on a
     * newer reveal replacing the track, on cancellation, and at the latest on
     * `TIMINGS.securityDockMax`.
     */
    function dockSecurityReveal(
      key: number,
      dock: SecurityBranchScene,
      own: { notices: readonly MatchNotice[]; panels: readonly SidePanel[] },
    ) {
      securityDockRef.current = { key, closed: false };
      enqueue({
        id: `security-dock-in-${key}`,
        track: CENTER_STAGE_TRACK,
        // It carries the revealed card, which is the one thing on screen worth reading.
        skippable: false,
        async run(context) {
          setSecurityBranch(dock);
          await context.wait(SECURITY_BRANCH_IN_MS);
          if (context.cancelled) return;
          // Docked and legible: the card's OWN clause may be read out now, and the decision
          // it asks for may open beside it — the reference client opens its panel here.
          // Only its own: anything a card it went on to play caused belongs to a later cue.
          openHeld(own.notices, own.panels);
          setPendingRevealKey((current) => (current === key ? null : current));
        },
      });
      // The hold runs on its own track. It ends only when the check closes, which the
      // server may take several batches to reach, and everything the check causes in the
      // meantime — the played card entering the field, its [On Play] notice, the panel of
      // cards it revealed — has to be able to queue behind the dock's ARRIVAL rather than
      // behind its departure.
      enqueue({
        id: `security-dock-hold-${key}`,
        track: SECURITY_DOCK_TRACK,
        skippable: false,
        async run(context) {
          // Replay collapses every wait, so there is no time to hold the card through and
          // a poll would spin: a replayed check goes straight to its final state.
          if (context.mode === "replay") return;
          let waitedMs = 0;
          try {
            while (!context.cancelled && waitedMs < TIMINGS.securityDockMax) {
              const held = securityDockRef.current;
              if (held === null || held.key !== key || held.closed) return;
              await context.wait(TIMINGS.securityDockPoll);
              waitedMs += TIMINGS.securityDockPoll;
            }
            // Cancelled, or the close never came: the card is not left parked for good.
            setSecurityBranch((current) => (current?.key === key ? null : current));
          } finally {
            if (securityDockRef.current?.key === key) securityDockRef.current = null;
            if (context.cancelled) setSecurityBranch((current) => (current?.key === key ? null : current));
          }
        },
      });
    }

    /**
     * Let go of whatever this check's battle was holding back. Called from every path that
     * ends a check — the outcome beat, a close with no battle to draw, a cancelled scene —
     * because a gate this one-sided wedges the shatter forever if a path forgets it.
     */
    function releaseSecurityBlow(key: number) {
      const blow = securityBlowRef.current;
      if (blow?.key !== key) return;
      blow.landed = true;
      blow.gate.release();
      setHeldBlowState(undefined);
    }

    /** The check has closed, so the docked card holds a beat and then leaves. */
    function undockSecurityReveal(key: number) {
      const held = securityDockRef.current;
      if (held?.key === key) held.closed = true;
      enqueue({
        id: `security-dock-out-${key}`,
        track: CENTER_STAGE_TRACK,
        skippable: false,
        async run(context) {
          try {
            setSecurityBranch((current) => (current?.key === key ? { ...current, state: "closing" } : current));
            await context.wait(SECURITY_DOCK_CLOSE_MS);
          } finally {
            setSecurityBranch((current) => (current?.key === key ? null : current));
          }
        },
      });
    }

    /**
     * Plays the reveal out to its end and takes it off the screen. A check the server is
     * still resolving used to keep the card centre-stage the whole time, so its effects —
     * their notices, their prompts — read from behind the card that caused them. The card
     * leaves first instead, and the board it hands over is clear.
     */
    function clearSecurityReveal(key: number) {
      enqueue({
        id: `security-clash-exit-${key}`,
        track: CENTER_STAGE_TRACK,
        // The card is the one thing on screen worth reading, so its last beat keeps its time.
        skippable: false,
        async run(context) {
          try {
            await context.wait(CLASH_TOTAL_MS - CLASH_OUTCOME_AT_MS);
          } finally {
            setSecurityClash((current) => (current?.key === key ? null : current));
          }
        },
      });
    }

    /**
     * Keeps the revealed Digimon centre-stage until the server says how its battle ended.
     * The engine closes a check only once everything that check caused has resolved, so a
     * removal reaction that stops to ask a question — even a bot's, which took 2.7s in the
     * log this was written from — lands between the reveal and the outcome. Letting the card
     * leave in that gap put the attacker's death on screen seconds before the blow that
     * dealt it, and then flashed the card back for its outcome beat on a board it had
     * already handed over. It waits here instead, and the outcome plays on the card itself.
     *
     * Open-ended, so it is bounded in every direction it can be, exactly as the dock is: it
     * ends on the matching `securityChecked`, on a newer reveal claiming the key, on
     * cancellation, and at the latest on `TIMINGS.securityDockMax`.
     */
    function holdSecurityReveal(key: number) {
      securityHoldRef.current = { key, closed: false };
      enqueue({
        id: `security-clash-hold-${key}`,
        track: SECURITY_HOLD_TRACK,
        skippable: false,
        async run(context) {
          // Replay collapses every wait, so there is no time to hold the card through and
          // a poll would spin: a replayed check goes straight to its final state.
          if (context.mode === "replay") return;
          let waitedMs = 0;
          try {
            while (!context.cancelled && waitedMs < TIMINGS.securityDockMax) {
              const held = securityHoldRef.current;
              if (held === null || held.key !== key) return;
              if (held.closed) return;
              if (held.handedOver) {
                giveUp();
                return;
              }
              await context.wait(TIMINGS.securityDockPoll);
              waitedMs += TIMINGS.securityDockPoll;
            }
            // Cancelled, or the close never came: the card is not left on stage for good.
            giveUp();
          } finally {
            if (securityHoldRef.current?.key === key) securityHoldRef.current = null;
            if (context.cancelled) giveUp();
          }
          // The card has left without its verdict, so the close that eventually arrives has
          // to bring it back for its battle rather than settle a scene no longer on screen.
          function giveUp() {
            setSecurityClash((current) => (current?.key === key ? null : current));
            const staged = revealOnStageRef.current;
            if (staged?.key === key) revealOnStageRef.current = { ...staged, exited: true };
          }
        },
      });
    }

    /** Reads out what the check has to say, beside the card it is about. */
    function readOutSecurityNotices(
      key: number,
      own?: { notices: readonly MatchNotice[]; panels: readonly SidePanel[] },
    ) {
      // Reserve this check's notices now so a later check cannot read or flush them.
      const notices = own?.notices ?? heldNoticesRef.current;
      const panels = own?.panels ?? heldPanelsRef.current;
      if (!own) {
        heldNoticesRef.current = [];
        heldPanelsRef.current = [];
      }
      enqueue({
        id: `security-notices-${key}`,
        track: CENTER_STAGE_TRACK,
        skippable: false,
        run() {
          openHeld(notices, panels);
        },
      });
    }

    /**
     * Hands the board back. The check has now said everything it has to say: the card was
     * revealed, it fought or took its place at the side, and its clause is on screen. Only
     * here do the decisions it asks for get a surface. Clearing this at the outcome beat
     * instead opened a prompt over a card that had not reached the side yet.
     */
    function releaseSecurityPresentation(key: number) {
      enqueue({
        id: `security-presented-${key}`,
        track: CENTER_STAGE_TRACK,
        skippable: false,
        run() {
          setPendingRevealKey((current) => (current === key ? null : current));
        },
      });
      // A cue that never reached the screen must not leave the check's presentation
      // held back for good, so the flag is dropped at the latest when nothing is running.
      if (!replayingHistory) {
        void queue.idle().then(() => setPendingRevealKey((current) => (current === key ? null : current)));
      }
    }

    /** Reads out what the check has to say, then hands the board back to the player. */
    function presentSecurityReveal(key: number) {
      readOutSecurityNotices(key);
      releaseSecurityPresentation(key);
    }

    if (securityReveal?.kind === "securityRevealed") {
      securityClashKeyRef.current += 1;
      const key = securityClashKeyRef.current;
      const revealed = buildSecurityRevealScene({
        key,
        revealedCardId: securityReveal.revealedCardId,
        revealedArtId: securityReveal.artId,
        securityCardDP: securityReveal.securityCardDP,
        attackerDP: securityReveal.attackerDP,
        defenderSeat: securityReveal.seat,
        viewerSeat,
        attacker: securityAttackerRef.current
          ? { ...securityAttackerRef.current, artId: securityReveal.attackerArtId ?? securityAttackerRef.current.artId }
          : undefined,
      });
      // A check that closes inside this same batch never shows the pending state: its
      // outcome is already known, so the scene is staged settled and reads the way it
      // always has. Only a check the server is still resolving holds the card unsettled.
      const settled = closingCheck ? settleSecurityClashScene(revealed, closingCheck) : revealed;
      // The server names what the card is about to do, so the client can commit to the
      // dock at the reveal rather than guessing from the close that has not arrived. An
      // older server (or a replayed history) sends no hint, and falls back to the
      // centre-stage scene that plays itself out.
      const docking = securityReveal.hasSecurityEffect === true && !closingCheck;
      stageSecurityReveal(key, settled, securityReveal.seat, { docking });
      revealOnStageRef.current = { key, scene: settled, ...(docking ? { docked: true } : {}) };
      heldNoticesRef.current = [...heldNoticesRef.current, ...heldNotices];
      heldPanelsRef.current = [...heldPanelsRef.current, ...heldPanels];
      // With the close still outstanding, the card plays its scene out and leaves, and
      // everything it causes queues behind that: the notices it earns, and the decisions its
      // effect asks for. The board is NOT given back here — the check is still running, and a
      // reaction that the removal armed ("when your opponent's security stack is removed
      // from") would open its prompt while the card is still on screen. It is handed back at
      // the close, or, for a check the server stops to ask the viewer something, by the
      // question itself (see the effect below), which is the one release a close cannot wait
      // for; either way the card has already gone.
      if (docking) {
        dockSecurityReveal(
          key,
          buildSecurityDockScene({
            key,
            revealedCardId: securityReveal.revealedCardId,
            revealedArtId: securityReveal.artId,
            defenderSeat: securityReveal.seat,
            viewerSeat,
          }),
          { notices: heldNotices, panels: heldPanels },
        );
      } else if (!closingCheck) {
        // A revealed Digimon with an attacker still standing is in a battle whose verdict
        // only the close carries. That card stays up until it has one, so the blow and the
        // deletion it causes read in the order they happened. Anything else — an Option, a
        // Tamer with no clause, a check whose attacker is already gone — has nothing left to
        // show, so it plays out and leaves, and its consequences read on a clear board.
        const battlePending = securityReveal.isDigimon === true && securityAttackerRef.current !== undefined;
        if (battlePending) {
          holdSecurityReveal(key);
          revealOnStageRef.current = { key, scene: settled };
        } else {
          clearSecurityReveal(key);
          revealOnStageRef.current = { key, scene: settled, exited: true };
        }
        readOutSecurityNotices(key, { notices: heldNotices, panels: heldPanels });
      }
      // An unfinished check parks at the right before its eventual close, so its free
      // play can arrive now. A closing check queues this after its branch-in below.
      if (!closingCheck) enqueueDeferredSecurityArrivals(key);
    }
    if (securityCheck?.kind === "securityChecked") {
      const staged = revealOnStageRef.current;
      // A close with no reveal on stage is a client that joined mid-check (reconnect
      // replay) or an older server: stage the finished scene now so the card is still
      // shown before its outcome.
      const key = staged?.key ?? (securityClashKeyRef.current += 1);
      // The verdict is here, so the hold that was waiting for it releases the card. Marked
      // rather than cleared: the poll owns the ref and drops it as it returns.
      const heldForBattle = securityHoldRef.current;
      if (heldForBattle?.key === key) heldForBattle.closed = true;
      // A scene that has been holding the card on stage since an earlier batch starts its
      // outcome beat now; one staged in this batch keeps the reference client's lead-in.
      const heldOnStage = staged !== null && !closesFreshReveal;
      // A card the hold let go of is not on stage any more, however long it held before it
      // gave up. Its battle is staged again from nothing, so it needs the whole lead-in --
      // the attacker taking its place, the reveal, the hold -- rather than the outcome beat
      // a card still standing there would take. Without this the blow lands in the 510 ms
      // tail on a card the viewer never saw arrive.
      const restagedBattle = staged?.exited === true && securityCheck.resolution === "battle";
      const scene = settleSecurityClashScene(
        staged?.scene ??
          buildSecurityRevealScene({
            key,
            revealedCardId: securityCheck.revealedCardId,
            revealedArtId: securityCheck.artId,
            defenderSeat: securityCheck.seat,
            viewerSeat,
            attacker: securityAttackerRef.current
              ? {
                  ...securityAttackerRef.current,
                  artId: securityCheck.attackerArtId ?? securityAttackerRef.current.artId,
                }
              : undefined,
          }),
        { ...securityCheck, ...(heldOnStage && !restagedBattle ? { outcomeAtMs: 0 } : {}) },
      );
      const docked = staged?.docked === true;
      const staging = staged === null;
      if (staging) {
        stageSecurityReveal(key, scene, securityCheck.seat);
        heldNoticesRef.current = [...heldNoticesRef.current, ...heldNotices];
        heldPanelsRef.current = [...heldPanelsRef.current, ...heldPanels];
      }
      revealOnStageRef.current = null;
      // The detour to the side of the screen belongs to a card whose effect has not been
      // seen yet. A card that already held the centre of the screen through its own
      // resolution has been seen, so it takes the outcome beat and leaves.
      const branch = heldOnStage
        ? null
        : buildSecurityBranchScene({
            key,
            revealedCardId: securityCheck.revealedCardId,
            revealedArtId: securityCheck.artId,
            resolution: securityCheck.resolution,
            defenderSeat: securityCheck.seat,
            viewerSeat,
          });
      // The docked card leaves first, so the outcome — when there is one to show — plays
      // on a board it has already handed back.
      if (docked) undockSecurityReveal(key);
      // A card that already played out and left the screen is not brought back for the
      // close; the check's remaining beats belong to a board it has handed over. A docked
      // card comes back to the centre only for a battle, which is the one outcome the dock
      // has no way to draw: it needs the attacker beside it.
      // A live server can finish the battle after removal reactions have already
      // let the reveal leave. Its battle still needs both cards on centre stage.
      const restoreBattle = scene.resolution === "battle" && (docked || staged?.exited === true);
      if (restoreBattle || (staged?.exited !== true && !docked)) {
        enqueue({
          id: `security-clash-outcome-${key}`,
          track: CENTER_STAGE_TRACK,
          async run(context) {
            try {
              // The verdict reaches the scene here, so a card held through a long resolution
              // takes the claw at the close rather than wearing the outcome the whole time.
              // A docked card is not on stage at all, so its battle puts it back there.
              if (restoreBattle) setSecurityClash(scene);
              else setSecurityClash((current) => (current?.key === key ? scene : current));
              await context.wait(restagedBattle ? CLASH_TOTAL_MS : CLASH_TOTAL_MS - CLASH_OUTCOME_AT_MS);
            } finally {
              setSecurityClash((current) => (current?.key === key ? null : current));
              releaseSecurityBlow(key);
            }
          },
        });
      } else {
        // No outcome beat to wait for — the check closed on something with no battle to
        // draw — so nothing it deleted should keep waiting on one.
        releaseSecurityBlow(key);
      }
      // Step 10b: the revealed card takes its place at the side of the screen BEFORE its
      // clause is read out, so the notice lands beside the card it explains rather than
      // ahead of it (the reference client flies the card to the execute zone, then opens
      // the panel). A check that resolves no effect has no detour, so its notices follow
      // the outcome directly.
      if (branch) {
        // The slide itself is decoration, so a click through the scene collapses it and
        // the card simply appears at the side.
        enqueue({
          id: `security-branch-in-${key}`,
          track: CENTER_STAGE_TRACK,
          async run(context) {
            setSecurityBranch(branch);
            await context.wait(SECURITY_BRANCH_IN_MS);
          },
        });
      }
      // When the reveal and close arrive in one batch, the security card must visibly
      // reach the right-hand execution slot before a Tamer it played enters the field.
      if (closingCheck) enqueueDeferredSecurityArrivals(key);
      // A reveal already on stage has read out its notices; only a scene staged straight
      // from the close still owes them. The board comes back either way: a check that ran
      // long has been holding it since the reveal.
      if (closesFreshReveal || staging) presentSecurityReveal(key);
      else releaseSecurityPresentation(key);
      if (branch) {
        // The card holds next to its notice, then the centre of the board is given back.
        enqueue({
          id: `security-branch-${key}`,
          track: CENTER_STAGE_TRACK,
          // It holds the revealed card next to the notice that explains it.
          skippable: false,
          async run(context) {
            try {
              await context.wait(SECURITY_BRANCH_TOTAL_MS - SECURITY_BRANCH_IN_MS);
            } finally {
              setSecurityBranch((current) => (current?.key === branch.key ? null : current));
            }
          },
        });
      }
    }
    // A card an effect took out of a security stack is not checked, so nothing above
    // narrates it — the stack simply got shorter. The reference client plays the whole
    // per-card sequence instead (shield break, the card revealed centre-stage, then the
    // card broken where it stands), once for EVERY card, so a Ragnarok Cannon emptying a
    // stack is seen card by card rather than as a counter dropping by four.
    const destructions = securityDestructionsFromEvents(fresh, sidePanelLookupRef.current);
    // Read once, before any of the scenes: it is the figure that still counts every card
    // the run is about to spend, and each card puts one back as its own scene breaks it.
    const securityBeforeDestruction = new Map<Seat, number | undefined>(
      destructions.map((destruction) => [destruction.seat, securityCountOf(destruction.seat)]),
    );
    const spentPerSeat = new Map<Seat, number>();
    destructions.forEach((destruction, index) => {
      securityClashKeyRef.current += 1;
      const key = securityClashKeyRef.current;
      const spent = spentPerSeat.get(destruction.seat) ?? 0;
      spentPerSeat.set(destruction.seat, spent + 1);
      const before = securityBeforeDestruction.get(destruction.seat);
      holdSecurityCard(key, destruction.seat, before === undefined ? undefined : before - spent);
      const scene = buildSecurityDestructionScene({
        key,
        cardId: destruction.cardId,
        artId: destruction.artId,
        trashedSeat: destruction.seat,
        viewerSeat,
      });
      // Only the first card takes the centre of the screen off whatever held it; the rest
      // queue behind their predecessor on the same track — including a predecessor from an
      // EARLIER batch: a chained effect delivers one trash per batch, and replacing would
      // cancel the previous card's scene mid-play.
      enqueue(
        shieldBreakStep(buildSecurityBreakScene({ key, defenderSeat: destruction.seat, viewerSeat }), {
          replace: index === 0 && pendingDestructionsRef.current === 0,
        }),
      );
      pendingDestructionsRef.current += 1;
      enqueue({
        id: `security-destroyed-${key}`,
        track: CENTER_STAGE_TRACK,
        // Which card the stack just lost is information, not decoration: it keeps its
        // time even under reduced motion or on a hidden tab.
        skippable: false,
        async run(context) {
          try {
            setSecurityClash(scene);
            // The stack loses this card as it breaks, so the shield drops one at that beat
            // rather than all of them at once when the effect resolved.
            await context.wait(SECURITY_DESTROY_OUTCOME_AT_MS);
            releaseSecurityCard(key);
            await context.wait(SECURITY_DESTROY_TOTAL_MS - SECURITY_DESTROY_OUTCOME_AT_MS);
          } finally {
            pendingDestructionsRef.current = Math.max(0, pendingDestructionsRef.current - 1);
            releaseSecurityCard(key);
            setSecurityClash((current) => (current?.key === key ? null : current));
          }
        },
      });
      releaseSecurityCardWhenIdle(key);
    });
    if (destructions.length > 0) {
      // A destruction step dropped from the queue before it ever ran (a newer check
      // replacing the track) never reaches its `finally`, so the count is squared with
      // reality at the latest when nothing is running — same discipline as the held
      // shield figures above.
      void queue.idle().then(() => {
        pendingDestructionsRef.current = 0;
      });
      // The trashed cards own the centre of the screen exactly as a reveal does, so a
      // question the same batch carries — the order of the triggers the effect fired,
      // say — waits behind the last card's scene. Opened at once, its dialog covered the
      // very cards the effect just spent.
      const lastKey = securityClashKeyRef.current;
      if (!replayingHistory) setPendingRevealKey(lastKey);
      releaseSecurityPresentation(lastKey);
    }
    for (const scene of clashScenes) {
      const impacted: ReadonlySet<string> = new Set(scene.loserPermanentIds);
      enqueue({
        id: `field-clash-${scene.key}`,
        track: "combatImpact",
        replace: true,
        async run(context) {
          if (context.mode !== "live") return;
          try {
            setFieldClash(scene);
            await context.wait(FIELD_CLASH_LUNGE_AT_MS);
            if (context.cancelled) return;
            setAttackLunge({ permanentId: scene.attacker.permanentId, direction: scene.direction });
            await context.wait(FIELD_CLASH_IMPACT_AT_MS - FIELD_CLASH_LUNGE_AT_MS);
            if (context.cancelled) return;
            setCombatImpactIds(impacted);
            await context.wait(COMBAT_IMPACT_TOTAL_MS);
          } finally {
            setFieldClash((current) => (current?.key === scene.key ? null : current));
            setAttackLunge((current) => (current?.permanentId === scene.attacker.permanentId ? null : current));
            setCombatImpactIds((current) => (current === impacted ? new Set() : current));
          }
        },
      });
    }
    if (beaten.size > 0) {
      const impacted: ReadonlySet<string> = new Set(beaten);
      enqueue({
        id: `combat-impact-${[...beaten].join(",")}`,
        track: "combatImpact",
        replace: true,
        async run(context) {
          if (context.mode !== "live") return;
          try {
            setCombatImpactIds(impacted);
            await context.wait(COMBAT_IMPACT_TOTAL_MS);
          } finally {
            setCombatImpactIds((current) => (current === impacted ? new Set() : current));
          }
        },
      });
    }
    const deletionBurstAnchors = new Set<string>();
    const deletionMetadata = new Map(
      fresh.flatMap((event) =>
        event.kind === "cardsMoved" && event.deletedPermanents
          ? event.deletedPermanents.map((deleted) => [deleted.permanentId, deleted] as const)
          : [],
      ),
    );
    for (const event of fresh) {
      for (const anchorId of deletionAnchorIdsFromEvent(event)) {
        // A combat resolution and the deletion movement can share a batch. The former
        // describes why the permanent left; the latter carries its public identity. One
        // permanent gets one shatter even when both events are present.
        if (deletionBurstAnchors.has(anchorId) || deletionBurstPresentedRef.current.has(anchorId)) continue;
        deletionBurstAnchors.add(anchorId);
        // A deletion a battle dealt waits for the blow; one an announced play dealt waits
        // for the beats that explain it — the card centre-stage under its call-out, then
        // the clause that did the deleting — capped so the shatter never drifts far from
        // the board dropping the permanent.
        // A check whose battle has not been drawn yet owns every deletion in this batch:
        // the server moves the loser to the trash before it closes the check, so without
        // this the shatter plays over a battle the viewer is still waiting to see.
        const openBlow = securityBlowRef.current;
        const blowKey = openBlow !== null && !openBlow.landed ? openBlow.key : undefined;
        const delayMs =
          blowKey !== undefined
            ? 0
            : clashLoserIds.has(anchorId)
              ? FIELD_CLASH_TOTAL_MS
              : beaten.has(anchorId)
                ? COMBAT_IMPACT_TOTAL_MS
                : Math.min(playLeadInMs, PLAY_LEAD_IN_BUDGET_MS);
        const deleted = deletionMetadata.get(anchorId);
        const step = deleteBurstStep(
          anchorId,
          delayMs,
          deleted?.cardId,
          deleted?.artId,
          deleted?.seat,
          deleted?.instanceId,
          blowKey === undefined && !clashLoserIds.has(anchorId) && !beaten.has(anchorId),
          blowKey,
        );
        if (step) {
          deletionBurstPresentedRef.current.add(anchorId);
          enqueue(step);
        }
      }
    }
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
      undockSecurityReveal(dockedReveal.key);
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
  const narrationRef = useRef(narration);
  narrationRef.current = narration;

  /**
   * The clauses a ribbon at `phaseOrder` would cover: everything an earlier phase raised.
   *
   * The ribbon waits one readable beat for them, but it no longer takes them off the
   * screen: a clause keeps its own six-second clock across the turn change, so a moment
   * raised at the end of a turn is still readable once the ribbons are done.
   */
  function narrationBefore(phaseOrder: number): NarrationItem[] {
    return [...narrationRef.current.values()].filter(
      (item) => (narrationPhaseOrdersRef.current.get(item.id) ?? 0) < phaseOrder,
    );
  }

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
          step.track !== SECURITY_DOCK_TRACK &&
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
          side: openedPhase.nextSeat === viewerSeat ? "you" : "opp",
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
                // Both boards release here, not just the turn player's: ＜Reboot＞
                // unsuspends the opposing Digimon in this same phase (§16-11), and the
                // server reports it among this phase's moves. Releasing only the turn
                // seat left a Reboot holder rotated until the hold lifted a phase later.
                setHeldPhaseState((held) =>
                  held
                    ? ({
                        ...held,
                        players: held.players.map((player) => ({
                          ...player,
                          battleArea: player.battleArea.map((permanent) => ({
                            ...permanent,
                            isSuspended: unsuspendedIds.has(permanent.permanentId) ? false : permanent.isSuspended,
                          })),
                        })),
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
      track: CENTER_STAGE_TRACK,
      skippable: false,
      run() {
        flushHeldNotices();
        const held = securityHoldRef.current;
        if (held?.key === key && !held.closed) held.handedOver = true;
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
    const causingEffectGate = causingEffectGateRef.current;
    for (const pulse of pulses) {
      queue.enqueue({
        id: `dp-pulse-${pulse.key}`,
        // Several figures can move in one resolution, so each card pulses on its
        // own track rather than queueing behind another card's.
        track: `dpPulse-${pulse.permanentId}`,
        replace: true,
        async run(context) {
          if (context.mode !== "live") return;
          await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS);
          if (context.cancelled) return;
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
    const heldSide = heldSeat === null ? undefined : heldSeat === viewerSeat ? "you" : "opp";
    const previous = handCountsRef.current;
    handCountsRef.current = {
      you: heldSide === "you" && previous ? previous.you : you.handCount,
      opp: heldSide === "opp" && previous ? previous.opp : opp.handCount,
    };
    if (!previous || mulliganOpen) {
      turnStartDrawRef.current = { you: false, opp: false };
      return;
    }
    const turnStart = turnStartDrawRef.current;
    turnStartDrawRef.current = { you: heldSide === "you" && turnStart.you, opp: heldSide === "opp" && turnStart.opp };
    if (heldSide !== "opp" && opp.handCount > previous.opp && eventDrawCountsRef.current.opp !== opp.handCount)
      launchDrawFlight("opp", turnStart.opp);
    if (heldSide !== "you" && you.handCount > previous.you && eventDrawCountsRef.current.you !== you.handCount)
      launchDrawFlight("you", turnStart.you);
    eventDrawCountsRef.current = heldSide ? { [heldSide]: eventDrawCountsRef.current[heldSide] } : {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [you?.handCount, opp?.handCount, phaseBanner]);

  /** The card lands on the stack: the same shield bounce a recovery plays. */
  function launchSecurityGainFlight(seat: Seat) {
    const key = (securityGainKeyRef.current += 1);
    queue.enqueue({
      id: `security-gain-flight-${seat}-${key}`,
      track: `securityFlight-${seat}`,
      replace: true,
      async run(context) {
        if (context.mode !== "live") return;
        try {
          setSecurityFlights((seats) => new Set(seats).add(seat));
          await context.wait(TIMINGS.securityFlight);
        } finally {
          setSecurityFlights((seats) => {
            if (!seats.has(seat)) return seats;
            const next = new Set(seats);
            next.delete(seat);
            return next;
          });
        }
      },
    });
  }

  /**
   * The opening five cards (Comprehensive Rules §5-2-1-6). The server sets the whole stack
   * in one patch, so the deal is the client's own: one card back flies from the deck to the
   * shield per card, and the shield's figure follows the cards rather than the patch.
   */
  function launchOpeningSecurityDeal(seat: Seat, count: number) {
    setSecurityDealCounts((counts) => new Map(counts).set(seat, 0));
    queue.enqueue({
      id: `security-deal-${seat}`,
      track: `securityDeal-${seat}`,
      replace: true,
      async run(context) {
        try {
          for (let dealt = 0; dealt < count; dealt += 1) {
            if (context.cancelled) return;
            launchDeckToSecurityFlight(seat);
            await context.wait(TIMINGS.securityDealStagger);
            setSecurityDealCounts((counts) => new Map(counts).set(seat, dealt + 1));
          }
          await context.wait(TIMINGS.securityFlight);
        } finally {
          setSecurityDealCounts((counts) => {
            if (!counts.has(seat)) return counts;
            const next = new Map(counts);
            next.delete(seat);
            return next;
          });
        }
      },
    });
  }

  // A security stack that grew outside a recovery was stacked by an effect — a card
  // placed there from the hand, the deck or the trash. `cardsMoved` names no seat and
  // the stack is hidden from the opponent's view, so the growth is read off the count
  // the server publishes for exactly this purpose. The dealt opening stack is only a
  // baseline, and a growth a `securityRecovered` event claimed is not narrated twice.
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
      { seat: viewerSeat, side: "you" as const, amount: you.securityCount - previous.you },
      { seat: otherSeat(viewerSeat), side: "opp" as const, amount: opp.securityCount - previous.opp },
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

  /**
   * The beat before the reveal: the defender's shield arms, its glass shatters, and the
   * board holds while the shards clear. Pure motion — the clash that follows carries the
   * information — so it is skipped outright unless the queue is live.
   */
  function shieldBreakStep(
    scene: SecurityBreakScene,
    { replace = true, clausesBefore }: { replace?: boolean; clausesBefore?: string } = {},
  ): AnimationStep {
    return {
      id: `security-break-${scene.key}`,
      track: CENTER_STAGE_TRACK,
      // The check owns the centre of the screen from here, so whatever was being
      // announced there gives way at the break rather than during the reveal. Only the
      // FIRST break of a run takes the track: a destruction that spends several cards
      // breaks the same shield once per card, and each of those would otherwise cancel
      // the card before it.
      replace,
      async run(context) {
        if (context.mode !== "live") return;
        // Whatever the attack itself raised reads before the shield breaks. The server
        // resolves a [When Attacking] effect ahead of the reveal, but its toast glows the
        // source card first, so without this wait the check opened over a clause that had
        // not arrived yet and looked like it had fired afterwards.
        if (clausesBefore !== undefined) {
          const deadline = Date.now() + TIMINGS.securityClauseLead;
          while (
            !context.cancelled &&
            !context.skipping &&
            Date.now() < deadline &&
            queue.hasPendingStep(
              (step) => step.id.startsWith("narration-step-") && step.origin?.batchId !== clausesBefore,
            )
          )
            await context.wait(16);
          if (context.cancelled) return;
        }
        try {
          setSecurityBreak({ ...scene, phase: "arm" });
          await context.wait(SECURITY_BREAK_TIMINGS.armMs);
          if (context.cancelled) return;
          setSecurityBreak({ ...scene, phase: "break" });
          setSecurityHitSeat(scene.seat);
          await context.wait(SECURITY_BREAK_TIMINGS.breakMs + SECURITY_BREAK_TIMINGS.holdMs);
        } finally {
          // A replacing cue cancels the wait; the shield must not be left mid-break.
          setSecurityBreak((current) => (current?.key === scene.key ? null : current));
          setSecurityHitSeat((seat) => (seat === scene.seat ? null : seat));
        }
      },
    };
  }

  /**
   * The burst left where a deleted permanent stood. The board has already dropped the
   * permanent by the time the deletion is narrated, so the position comes from the last
   * measurement the caller kept, by permanent id or by the id of the card that sat on top;
   * with no measurement there is nowhere to draw it.
   */
  function deleteBurstStep(
    anchorId: string,
    delayMs = 0,
    metadataCardId?: string,
    metadataArtId?: string,
    metadataSeat?: Seat,
    metadataInstanceId?: string,
    effectDeletion = false,
    /** The security battle this deletion belongs to, if any; its blow gates the shatter. */
    blowKey?: number,
  ): AnimationStep | null {
    const center = anchors.permanentCenter?.(anchorId);
    if (!center) return null;
    const key = (deleteBurstKeyRef.current += 1);
    // The reference client shatters the card's own art rather than swapping it for
    // a generic puff, so the burst carries whichever card was standing there.
    const cardId = metadataCardId ?? anchors.permanentCardId?.(anchorId);
    const shattered = createPresentationGate();
    const causingEffectGate = causingEffectGateRef.current;
    void queue.idle().then(() => shattered.release());
    if (cardId && metadataSeat !== undefined) {
      const now = Date.now();
      deletionReadyAtRef.current.set(`${metadataSeat}:${cardId}`, {
        readyAt: now + delayMs + Math.max(TIMINGS.cardBurst, TIMINGS.cardShatter),
        instanceId: metadataInstanceId,
        shattered,
      });
    }
    const burst: DeleteBurst = {
      key,
      x: center.x - DELETE_BURST_SIZE / 2,
      y: center.y - DELETE_BURST_SIZE / 2,
      ...(effectDeletion ? { effectDeletion: true } : {}),
      ...(cardId ? { cardId, color: burstColorFor(cardId) } : {}),
      ...(metadataArtId ? { artId: metadataArtId } : {}),
    };
    return {
      id: `delete-burst-${key}`,
      // Several permanents can be deleted by one resolution, so each burst runs on its
      // own track instead of queueing behind the others.
      track: `deleteBurst-${key}`,
      async run(context) {
        if (context.mode !== "live") return shattered.release();
        await waitForGate(causingEffectGate, context, CONSEQUENCE_GATE_MAX_MS);
        if (context.cancelled) return shattered.release();
        // A permanent beaten in battle takes the blow before it breaks.
        if (delayMs > 0) await context.wait(delayMs);
        // A security battle's blow has no duration to wait out: its scene runs as long as
        // the check takes. Wait on its gate instead, under the dock's ceiling, so a close
        // that never comes cannot hold the shatter for good. This runs on the burst's own
        // track, so nothing on centre stage is waiting behind it.
        if (blowKey !== undefined) {
          const blow = securityBlowRef.current;
          if (blow !== null && blow.key === blowKey) await waitForGate(blow.gate, context, TIMINGS.securityDockMax);
        }
        if (context.cancelled) return shattered.release();
        try {
          setDeleteBursts((bursts) => [...bursts, burst]);
          await context.wait(Math.max(TIMINGS.cardBurst, TIMINGS.cardShatter));
        } finally {
          shattered.release();
          setDeleteBursts((bursts) => bursts.filter((candidate) => candidate.key !== key));
        }
      },
    };
  }

  /**
   * One riffle of a deck pile. Motion with nothing to read — the panel narrating
   * the cards going back already says what happened — so it is skipped outright
   * unless the queue is live.
   */
  function deckRiffleStep(riffle: DeckRiffle): AnimationStep {
    const id = `${riffle.seat}:${riffle.pile}`;
    return {
      id: `deck-riffle-${riffle.key}`,
      track: `deckRiffle-${id}`,
      replace: true,
      async run(context) {
        if (context.mode !== "live") return;
        try {
          setDeckRiffles((piles) => new Set(piles).add(id));
          await context.wait(TIMINGS.deckRiffle);
        } finally {
          setDeckRiffles((piles) => remove(piles, id));
        }
      },
    };
  }

  /**
   * One zone change, in the order the reference client plays it: the card is held
   * centre-screen while its destination stays hidden, then the permanent reveals
   * on its colour-keyed burst.
   *
   * The whole sequence is pure motion — the side panel and the effect notice
   * carry the information — so reduced motion, a hidden tab and replayed history
   * all drop it rather than flashing it past.
   */
  function zoneChangeStep(
    key: number,
    showcase: ZoneShowcase | null,
    burst: PermanentBurst | null,
    leadInMs = 0,
  ): AnimationStep {
    const origin = presentationBatchRef.current && {
      ...presentationBatchRef.current,
      phaseOrder: enqueuePhaseOrderRef.current,
    };
    return {
      id: `zone-change-${key}`,
      track: CENTER_STAGE_TRACK,
      async run(context) {
        // The caller may already be holding the permanent off the board on this step's
        // behalf, so every exit — including the ones that draw nothing — hands it back.
        if (context.mode !== "live") {
          if (burst) setPendingPermanentIds((held) => remove(held, burst.permanentId));
          return;
        }
        // A card that changed zones because of a battle waits for the battle to play.
        if (leadInMs > 0) await context.wait(leadInMs);
        if (context.cancelled) {
          if (burst) setPendingPermanentIds((held) => remove(held, burst.permanentId));
          return;
        }
        if (showcase) {
          try {
            if (burst) setPendingPermanentIds((held) => new Set(held).add(burst.permanentId));
            setZoneShowcase(showcase);
            await context.wait(SHOWCASE_TOTAL_MS);
          } finally {
            // A replacing cue (a security check) cancels the wait, and the board
            // must not be left holding a card up or hiding a permanent.
            setZoneShowcase((current) => (current?.key === showcase.key ? null : current));
            if (burst) setPendingPermanentIds((held) => remove(held, burst.permanentId));
          }
          if (context.cancelled) return;
        }
        if (!burst) return;
        // A Security play belonging to the viewer has no centre-screen showcase, but it
        // may still have been held until the source card completed its right-hand move.
        // Hand the field back at this landing beat, together with its burst.
        if (!showcase) setPendingPermanentIds((held) => remove(held, burst.permanentId));
        // The permanent's track also carries its effect prelude. Serialize later
        // arrivals so an automatic evolution cannot cancel the earlier toast.
        queue.enqueue({
          id: `burst-${burst.key}`,
          origin,
          track: `burst-${burst.permanentId}`,
          async run(burstContext) {
            if (burstContext.mode !== "live") return;
            setPermanentBursts((bursts) => new Map(bursts).set(burst.permanentId, burst));
            await burstContext.wait(TIMINGS.cardBurst);
            setPermanentBursts((bursts) => {
              if (bursts.get(burst.permanentId)?.key !== burst.key) return bursts;
              const next = new Map(bursts);
              next.delete(burst.permanentId);
              return next;
            });
          },
        });
      },
    };
  }

  /**
   * Sends a card back from a deck pile to the hand that just grew. The reference
   * client presents a draw centre-screen; the web port keeps the deck→hand read,
   * which is what makes an opponent's draw visible at all.
   */
  function launchDrawFlight(side: "you" | "opp", turnStart = false, waitBeforeMs = 0) {
    const board = anchors.board.current;
    const source = side === "you" ? anchors.yourDeck.current : anchors.oppDeck.current;
    const target = side === "you" ? anchors.yourHandDock.current : anchors.oppHandStrip.current;
    if (!board || !source || !target) return;
    const boardRect = board.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    // Layout-free environments (jsdom) report zero boxes: no geometry, no flight,
    // and so no step is ever enqueued there.
    if (!sourceRect.width || !targetRect.width) return;
    const from = {
      x: sourceRect.left + sourceRect.width / 2 - boardRect.left,
      y: sourceRect.top + sourceRect.height / 2 - boardRect.top,
    };
    const to = {
      x: targetRect.left + targetRect.width / 2 - boardRect.left,
      y: targetRect.top + targetRect.height / 2 - boardRect.top,
    };
    const key = (drawFlightKeyRef.current += 1);
    // The card back is hand-card sized on a phone; at 340ms that size crosses a
    // 393px screen too fast to register, so the touch layouts get a longer trip.
    // The element animates on this same number, set inline by GameScreen, so the
    // unmount below can never cut the flight short.
    const duration = isTouchLayout() ? TIMINGS.drawFlightTouch : TIMINGS.drawFlight;
    const flight: DrawFlight = { key, x: from.x, y: from.y, dx: to.x - from.x, dy: to.y - from.y, duration };
    // Two hands can grow at once, so each flight gets a track of its own rather
    // than queueing behind the other side's.
    queue.enqueue({
      id: `draw-flight-${key}`,
      side,
      track: `${turnStart ? "turnDrawFlight" : "drawFlight"}-${key}`,
      async run(context) {
        if (waitBeforeMs > 0) await context.wait(waitBeforeMs);
        if (context.cancelled) return;
        setDrawFlights((flights) => [...flights, flight]);
        await context.wait(duration);
        setDrawFlights((flights) => flights.filter((candidate) => candidate.key !== key));
        // Only the draw the turn opens with gets the starburst: an effect draw is
        // already narrated by its own notice, and two cues would read as two draws.
        if (!turnStart || context.mode !== "live" || context.cancelled) return;
        setDrawBursts((bursts) => [...bursts, { key, x: to.x, y: to.y }]);
        await context.wait(TIMINGS.drawBurst);
        setDrawBursts((bursts) => bursts.filter((candidate) => candidate.key !== key));
      },
    });
  }

  /** One card back from a seat's deck onto its security shield. */
  function launchDeckToSecurityFlight(seat: Seat) {
    const board = anchors.board.current;
    const source = seat === viewerSeat ? anchors.yourDeck.current : anchors.oppDeck.current;
    const target = seat === viewerSeat ? anchors.yourSecurity.current : anchors.oppSecurity.current;
    if (!board || !source || !target) return;
    const boardRect = board.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    // Layout-free environments (jsdom) report zero boxes: no geometry, no flight.
    if (!sourceRect.width || !targetRect.width) return;
    const x = sourceRect.left + sourceRect.width / 2 - boardRect.left;
    const y = sourceRect.top + sourceRect.height / 2 - boardRect.top;
    const key = (drawFlightKeyRef.current += 1);
    const duration = isTouchLayout() ? TIMINGS.drawFlightTouch : TIMINGS.drawFlight;
    const flight: DrawFlight = {
      key,
      x,
      y,
      dx: targetRect.left + targetRect.width / 2 - boardRect.left - x,
      dy: targetRect.top + targetRect.height / 2 - boardRect.top - y,
      duration,
    };
    // Each card of the deal is its own track: they overlap on purpose, so the stack is
    // built by a run of cards rather than by one card played five times.
    queue.enqueue({
      id: `security-deal-flight-${key}`,
      track: `securityDealFlight-${key}`,
      async run(context) {
        setDrawFlights((flights) => [...flights, flight]);
        await context.wait(duration);
        setDrawFlights((flights) => flights.filter((candidate) => candidate.key !== key));
      },
    });
  }

  function launchDeckToUnderFlight(seat: Seat, permanentId: string) {
    const board = anchors.board.current;
    const source = seat === viewerSeat ? anchors.yourDeck.current : anchors.oppDeck.current;
    const target = anchors.permanentCenter?.(permanentId);
    if (!board || !source || !target) return;
    const boardRect = board.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    if (!sourceRect.width) return;
    const x = sourceRect.left + sourceRect.width / 2 - boardRect.left;
    const y = sourceRect.top + sourceRect.height / 2 - boardRect.top;
    const key = ++drawFlightKeyRef.current;
    const duration = isTouchLayout() ? TIMINGS.drawFlightTouch : TIMINGS.drawFlight;
    const flight: DrawFlight = { key, x, y, dx: target.x - x, dy: target.y - y, duration };
    queue.enqueue({
      id: `deck-under-flight-${key}`,
      track: `deckUnder-${permanentId}`,
      async run(context) {
        setDrawFlights((flights) => [...flights, flight]);
        await context.wait(duration);
        setDrawFlights((flights) => flights.filter((candidate) => candidate.key !== key));
      },
    });
  }

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
    heldBlowState,
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
