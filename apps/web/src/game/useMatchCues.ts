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

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { GameState, Seat, ServerEvent } from "@aegis/shared";
import { playSound, type SoundKind } from "../design/sound";
import { buildInstanceIndex, eventsAfter, otherSeat } from "./boardModel";
import { shouldPlayCue, soundForEvent, type CueTimestamps } from "./soundEvents";
import {
  attackAnnouncementFromEvent,
  buildInstanceSeatIndex,
  dismissSidePanel,
  expireSidePanels,
  nextSidePanelExpiry,
  pushSidePanel,
  sidePanelFromEvent,
  type AttackAnnouncement,
  type SidePanel,
  type SidePanelLookup,
} from "./sidePanels";
import {
  dismissNotice,
  dismissOwnEffectNotices,
  effectNoticeFromEvent,
  expireNotices,
  keywordNoticeFromEvent,
  nextNoticeExpiry,
  pushNotice,
  recoveryNoticeFromEvent,
  rejectionNotice,
  securityGainNotice,
  securityGainNoticeFromEvent,
  type MatchNotice,
} from "./notices";
import {
  buildSecurityBranchScene,
  buildSecurityBreakScene,
  buildSecurityDestructionScene,
  buildSecurityDockScene,
  buildSecurityRevealScene,
  securityDestructionsFromEvents,
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
import { createAnimationQueue, type AnimationQueueMode, type AnimationStep } from "./animationQueue";
import { cutInFromEvent, type DigivolutionCutIn } from "./cutIn";
import { areCutInsEnabled } from "../design/cutIn";
import {
  effectActivationFromEvent,
  effectActivationTrack,
  type EffectActivation,
  type EffectSourceLookup,
} from "./effectSource";
import { deckRiffleFromEvent, type DeckRiffle } from "./deckChrome";
import { buildFieldClashScene, trackOpenAttack, type FieldClashScene, type OpenAttack } from "./fieldClash";
import { phaseBannerFrom, type PhaseBanner } from "./phaseBanner";
import { dpPulses as diffDpPulses, type DpPulse } from "./dpPulse";
import { freezePulses as diffFreezePulses, type FreezeFlags, type FreezePulse } from "./freezePulse";
import {
  CLASH_DOCK_AT_MS,
  CLASH_OUTCOME_AT_MS,
  CLASH_REVEAL_SHOWN_AT_MS,
  CLASH_TOTAL_MS,
  COMBAT_IMPACT_TOTAL_MS,
  cutInTotalMs,
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
  /** The card that was there, so its own art can be the thing that shatters. */
  cardId?: string;
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
 * The open-ended wait that keeps a `[Security]` card parked in its dock until the check
 * closes. It is deliberately NOT the centre-stage track: the dock stays up across whole
 * batches, and the cues the docked card's effect provokes must be able to follow its
 * arrival on the centre-stage track instead of waiting for it to leave.
 */
const SECURITY_DOCK_TRACK = "securityDock";

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
}

export interface MatchCues {
  sidePanels: readonly SidePanel[];
  dismissPanel: (id: string) => void;
  notices: readonly MatchNotice[];
  dismissNotice: (id: string) => void;
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
  /**
   * True from the moment a security check is queued until the centre-stage scene has
   * finished showing the revealed card. Nothing that speaks for that card — its effect
   * notice, its branch, the decision it asks the viewer — may be presented while it is
   * set (battle-animation-spec.md §4b: the reveal is steps 6–9, the effect is step 10b).
   * A card an effect trashes out of a stack holds the same way, until its scene is over.
   */
  securityRevealPending: boolean;
  /**
   * A play the board is still explaining — the card held centre-stage under its
   * DigiXros call-out, then the [On Play] clause that deleted something. A prompt
   * those beats are the answer to must not open over them, but the board itself stays
   * live: this is a wall clock capped at {@link PLAY_LEAD_IN_BUDGET_MS}, so a beat that
   * never runs can never leave the viewer unable to answer.
   */
  decisionHeldForPlay: boolean;
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
  /** The full-screen cut-in currently playing, when the setting is on. */
  cutIn: DigivolutionCutIn | null;
  /** The zone-specific moment each activating effect source is currently playing. */
  effectSources: readonly EffectActivation[];
  /** The deck piles currently riffling, as `${seat}:${pile}`. */
  deckRiffles: ReadonlySet<string>;
  /** The seats whose security stack a recovered card is currently flying back onto. */
  securityFlights: ReadonlySet<number>;
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
  const seats = new Map<string, Seat>();
  const tops = new Map<string, string>();
  state.players.forEach((player, playerSeat) => {
    const seat = playerSeat as Seat;
    const key = (cardId: string) => `${seat}:${cardId}`;
    const permanents = [...player.battleArea, ...(player.breeding ? [player.breeding] : [])];
    for (const permanent of permanents) {
      const cardId = permanent.topCard?.cardId;
      if (cardId && !sites.has(key(cardId)))
        sites.set(key(cardId), { zone: "field", permanentId: permanent.permanentId });
      if (permanent.topCard?.instanceId) tops.set(permanent.permanentId, permanent.topCard.instanceId);
    }
    for (const card of player.trash) {
      if (card?.cardId && !sites.has(key(card.cardId)))
        sites.set(key(card.cardId), { zone: "trash", instanceId: card.instanceId });
    }
    for (const card of player.hand ?? []) {
      if (card?.cardId && !sites.has(key(card.cardId)))
        sites.set(key(card.cardId), { zone: "hand", instanceId: card.instanceId });
      if (card?.instanceId) seats.set(card.instanceId, seat);
    }
    // No deck/eggDeck entries: those zones are never sent to any client (HIDDEN_ZONE_VIEW_TAG),
    // so a card only becomes locatable once it reaches a zone the viewer can see.
  });
  return {
    locate: (cardId, seat) => sites.get(`${seat}:${cardId}`),
    seatOf: (instanceId) => seats.get(instanceId),
    topInstanceOf: (permanentId) => tops.get(permanentId),
  };
}

export function useMatchCues({
  events,
  state,
  viewerSeat,
  mulliganOpen,
  decisionPending = false,
  anchors,
  onActionRejected,
}: {
  events: readonly ServerEvent[];
  state: GameState | undefined;
  viewerSeat: Seat;
  /** The opening hand and a mulligan redeal are dealt, not drawn. */
  mulliganOpen: boolean;
  /**
   * The server is waiting on an answer from the viewer. A check the server stopped
   * mid-resolution to ask something can only be closed once that answer is given, so the
   * question is what releases a presentation still holding the screen (see below).
   */
  decisionPending?: boolean;
  anchors: MatchCueAnchors;
  onActionRejected: (reason: string) => void;
}): MatchCues {
  const queue = useMemo(
    () =>
      createAnimationQueue({
        onError: (error, step) => console.error("[MATCH_CUE] step failed", { step: step.id, error }),
      }),
    [],
  );

  const [sidePanels, setSidePanels] = useState<readonly SidePanel[]>([]);
  const [notices, setNotices] = useState<readonly MatchNotice[]>([]);
  const [attackAnnouncement, setAttackAnnouncement] = useState<AttackAnnouncement | null>(null);
  const [turnTransition, setTurnTransition] = useState<TurnTransitionCue | null>(null);
  const [securityClash, setSecurityClash] = useState<SecurityClashScene | null>(null);
  const [securityBreak, setSecurityBreak] = useState<SecurityBreakCue | null>(null);
  // Security cards a scene is still holding: the board has already dropped each one, and
  // the scene that shows it leaving has not reached that beat yet. Keyed by scene so a
  // cancelled scene releases exactly its own card and never a newer scene's.
  const [heldSecurityCards, setHeldSecurityCards] = useState<ReadonlyMap<number, { seat: Seat; count: number }>>(
    new Map(),
  );
  const [securityBranch, setSecurityBranch] = useState<SecurityBranchScene | null>(null);
  // The check whose reveal the screen still owes the viewer, by clash key.
  const [pendingRevealKey, setPendingRevealKey] = useState<number | null>(null);
  // When the beats explaining the play currently on screen are done, as a wall clock.
  // Null whenever nothing is being explained.
  const [playLeadInUntil, setPlayLeadInUntil] = useState<number | null>(null);
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
  const [combatImpactIds, setCombatImpactIds] = useState<ReadonlySet<string>>(new Set());
  const [fieldClash, setFieldClash] = useState<FieldClashScene | null>(null);
  const [dpPulses, setDpPulses] = useState<ReadonlyMap<string, DpPulse>>(new Map());
  const [freezePulses, setFreezePulses] = useState<ReadonlyMap<string, FreezePulse>>(new Map());
  const [cutIn, setCutIn] = useState<DigivolutionCutIn | null>(null);
  const [effectSources, setEffectSources] = useState<readonly EffectActivation[]>([]);
  const [deckRiffles, setDeckRiffles] = useState<ReadonlySet<string>>(new Set());
  const [securityFlights, setSecurityFlights] = useState<ReadonlySet<number>>(new Set());

  // Cues are observed twice for your own actions (the intent handler fires one
  // immediately, the server echo arrives later), so repeats are suppressed.
  const cuePlayedAtRef = useRef<CueTimestamps>({});
  const cueBaselineRef = useRef(false);
  const lastCueEventRef = useRef<ServerEvent | undefined>(undefined);
  const noticeSequenceRef = useRef(0);
  const sidePanelSequenceRef = useRef(0);
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
  // `cardsMoved` names only instance ids, so the panels need the board's current
  // identity and ownership index to name the cards that just moved.
  const sidePanelLookupRef = useRef<SidePanelLookup>({ cardId: () => undefined, seat: () => undefined });
  // The card the checked player is defending against. A security check carries no
  // attacker, so it is remembered from the attack that opened the check.
  const securityAttackerRef = useRef<SecurityClashAttacker | undefined>(undefined);
  const securityClashKeyRef = useRef(0);
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
  const cutInKeyRef = useRef(0);
  const effectSourceKeyRef = useRef(0);
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
  // Destruction scenes enqueued and not yet finished. A chained effect (Medusamon's
  // Petrification tokens) trashes one security card per resolution step, so each trash
  // arrives in its own batch — and each batch's first shield break must NOT take the
  // centre of the screen off the previous card's still-playing scene.
  const pendingDestructionsRef = useRef(0);
  // Set when the draw phase is announced and spent by the hand that grows in the
  // same commit, which is what tells a turn-start draw from an effect draw.
  const turnStartDrawRef = useRef({ you: false, opp: false });

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
  useEffect(() => {
    if (!state) return;
    const cardIds = buildInstanceIndex(state, viewerSeat);
    const seats = buildInstanceSeatIndex(state);
    sidePanelLookupRef.current = { cardId: (id) => cardIds.get(id), seat: (id) => seats.get(id) };
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
   * Hold the viewer's own prompt for `ms` while the beats that explain the play run.
   *
   * A wall clock rather than a queued step, and clamped: the prompt is the viewer's only
   * way to answer, so it may wait for the explanation but must never depend on a step
   * actually running to be released.
   */
  function holdForPlayLeadIn(ms: number) {
    if (ms <= 0) return;
    const until = Date.now() + Math.min(ms, PLAY_LEAD_IN_BUDGET_MS);
    setPlayLeadInUntil((current) => (current !== null && current > until ? current : until));
  }

  function openNotice(notice: MatchNotice) {
    setNotices((stack) => pushNotice(expireNotices(stack, notice.createdAt), notice));
  }

  /** Opens side panels on the clock they are opened at, not the one the server named them on. */
  function openPanels(panels: readonly SidePanel[]) {
    if (panels.length === 0) return;
    const now = Date.now();
    const stamped = panels.map((panel) => ({ ...panel, createdAt: now }));
    setSidePanels((stack) =>
      stamped.reduce<readonly SidePanel[]>((next, panel) => pushSidePanel(next, panel), expireSidePanels(stack, now)),
    );
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
    for (const notice of ownNotices) openNotice({ ...notice, createdAt: Date.now() });
    openPanels(ownPanels);
  }

  useEffect(() => {
    const previous = lastCueEventRef.current;
    const fresh = eventsAfter(events, previous);
    lastCueEventRef.current = events.at(-1);
    const rejection = [...fresh].reverse().find((event) => event.kind === "actionRejected");
    // A batch can carry a whole check (reveal then close), only its opening, or only its
    // close — a decision inside a [Security] effect is what splits the two apart. Only the
    // last of each is staged: a batch holding several checks plays the newest, which is
    // what the centre-stage track's `replace` does to the ones before it anyway.
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
    // The first pass is the baseline: a reconnect replays history, which must not
    // replay its sounds or reopen every panel the match has ever shown.
    const replayingHistory = !cueBaselineRef.current;
    cueBaselineRef.current = true;
    // Replayed steps still run, so their state lands in the right place — they
    // just run with every wait collapsed, which is no animation at all.
    const enqueue = (step: AnimationStep) => queue.enqueue(replayingHistory ? { ...step, mode: "replay" } : step);
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
    /** How long the cut-in this batch enqueued owns the centre of the screen first. */
    let cutInLeadInMs = 0;
    /**
     * How long the beats that explain an announced play own the screen before anything
     * that play caused may be narrated: the cut-in, the card held centre-stage under its
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

    if (!replayingHistory) {
      for (const event of fresh) {
        const cue = soundForEvent(event, viewerSeat);
        if (cue) playCue(cue);
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
        noticeSequenceRef.current += 1;
        const noticeId = `notice-${noticeSequenceRef.current}`;
        const notice =
          effectNoticeFromEvent(event, viewerSeat, noticeId, now, securityEffectPendingRef.current) ??
          recoveryNoticeFromEvent(event, viewerSeat, noticeId, now) ??
          securityGainNoticeFromEvent(event, viewerSeat, noticeId, now) ??
          keywordNoticeFromEvent(event, viewerSeat, noticeId, now);
        if (notice) {
          if (notice.body.variant === "effect") securityEffectPendingRef.current = false;
          raised.push(notice);
          noticeAt.push(eventIndex);
        }
      }
      // The cut-in owns the centre of the screen ahead of the showcase, so the
      // announcement lands on a screen the player is already looking at. Pure
      // spectacle behind a setting: skippable, and dropped outright under reduced
      // motion or a hidden tab.
      for (const event of fresh) {
        cutInKeyRef.current += 1;
        const announced = cutInFromEvent(event, cutInKeyRef.current, areCutInsEnabled());
        if (!announced) continue;
        // A cut-in replaces the track, so only the last one enqueued in a batch ever
        // plays: what it costs the beats behind it is its own length, not the sum.
        cutInLeadInMs = cutInTotalMs(announced.tier);
        enqueue({
          id: `cut-in-${announced.key}`,
          track: CENTER_STAGE_TRACK,
          replace: true,
          async run(context) {
            if (context.mode !== "live") return;
            await context.wait(combatLeadInMs);
            if (context.cancelled) return;
            try {
              setCutIn(announced);
              await context.wait(cutInTotalMs(announced.tier));
            } finally {
              setCutIn((current) => (current?.key === announced.key ? null : current));
            }
          },
        });
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
        showcased ||= showcase !== null;
        if (showcase) firstArrivalIndex = Math.min(firstArrivalIndex, eventIndex);
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
              for (const notice of callout) openNotice({ ...notice, createdAt: Date.now() });
            },
          });
        }
        const step = zoneChangeStep(key, showcase, burst, leadInMs);
        if (securityReveal) zoneChanges.push(step);
        else enqueue(step);
        // The board renders a permanent the moment its patch lands, so a card whose
        // arrival is still queued has to be held back from the field until the cue
        // that shows it arriving actually runs — otherwise it is simply there.
        if (showcase && burst) {
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
      const presenting = raised.length > 0 || opened.length > 0;
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
      } else if (showcased && presenting) {
        const heldForShowcase = afterShowcaseNotices;
        const panelsForShowcase = opened;
        // The clause the played card triggered gets the beat after the showcase to itself:
        // it is read out, and only then does what it did reach the board.
        const clauseRead = heldForShowcase.some((notice) => notice.body.variant === "effect");
        playLeadInMs = showcasePlays
          ? cutInLeadInMs + SHOWCASE_TOTAL_MS + (clauseRead ? TIMINGS.effectAnnounce : 0)
          : 0;
        enqueue({
          id: `showcase-notices-${showcaseKeyRef.current}`,
          track: CENTER_STAGE_TRACK,
          skippable: false,
          run() {
            for (const notice of heldForShowcase) openNotice({ ...notice, createdAt: Date.now() });
            openPanels(panelsForShowcase);
          },
        });
        // The prompt this play is about to raise waits behind the same beats and the
        // shatter they end on, so the viewer reads what happened before being asked
        // about it.
        holdForPlayLeadIn(playLeadInMs > 0 ? playLeadInMs + TIMINGS.cardShatter : 0);
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
            for (const notice of held) openNotice({ ...notice, createdAt: Date.now() });
            openPanels(heldForCombat);
          },
        });
      } else {
        openPanels(opened);
        for (const notice of raised) openNotice(notice);
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
    if (rejection?.kind === "actionRejected") onActionRejected(rejection.reason);
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
        permanentId: securityAttack.attackerPermanentId,
        // Captured while the attacker is still on the field: an effect deletion names
        // the card instance rather than the permanent, so both ways in are kept.
        topInstanceId: cardSiteRef.current.topInstanceOf(securityAttack.attackerPermanentId),
      };
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
      // Whatever the check this one replaces had not said yet is said now, before it goes.
      flushHeldNotices();
      // A dock belongs to the check that opened it. Its hold no longer shares a track with
      // the reveal, so a newer check has to retire it by hand rather than by replacement.
      const stale = securityDockRef.current;
      if (stale && stale.key !== key) {
        securityDockRef.current = null;
        setSecurityBranch((current) => (current?.key === stale.key ? null : current));
      }
      // The board drops the checked card as soon as its patch lands; the shield keeps the
      // figure that still counts it until the reveal has actually put the card on screen.
      holdSecurityCard(key, seat, securityCountOf(seat));
      enqueue(shieldBreakStep(buildSecurityBreakScene({ key, defenderSeat: seat, viewerSeat })));
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

    /** Reads out what the check has to say, beside the card it is about. */
    function readOutSecurityNotices(
      key: number,
      own?: { notices: readonly MatchNotice[]; panels: readonly SidePanel[] },
    ) {
      // The clock on each notice starts here rather than when the server named it.
      enqueue({
        id: `security-notices-${key}`,
        track: CENTER_STAGE_TRACK,
        skippable: false,
        run() {
          if (own) openHeld(own.notices, own.panels);
          else flushHeldNotices();
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
        defenderSeat: securityReveal.seat,
        viewerSeat,
        attacker: securityAttackerRef.current,
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
            defenderSeat: securityReveal.seat,
            viewerSeat,
          }),
          { notices: heldNotices, panels: heldPanels },
        );
      } else if (!closingCheck) {
        clearSecurityReveal(key);
        revealOnStageRef.current = { key, scene: settled, exited: true };
        readOutSecurityNotices(key, { notices: heldNotices, panels: heldPanels });
      }
      // The card a `[Security]` effect played now arrives on the field, behind everything
      // the check has shown so far, and only once it is there does what IT did read out.
      for (const step of deferredZoneChanges) enqueue(step);
      releaseArrivalHoldsWhenIdle();
      if (afterArrivalNotices.length > 0 || afterArrivalPanels.length > 0) {
        const arrivalNotices = afterArrivalNotices;
        const arrivalPanels = afterArrivalPanels;
        enqueue({
          id: `security-arrival-notices-${key}`,
          track: CENTER_STAGE_TRACK,
          skippable: false,
          run() {
            for (const notice of arrivalNotices) openNotice({ ...notice, createdAt: Date.now() });
            openPanels(arrivalPanels);
          },
        });
      }
    }
    if (securityCheck?.kind === "securityChecked") {
      const staged = revealOnStageRef.current;
      // A close with no reveal on stage is a client that joined mid-check (reconnect
      // replay) or an older server: stage the finished scene now so the card is still
      // shown before its outcome.
      const key = staged?.key ?? (securityClashKeyRef.current += 1);
      // A scene that has been holding the card on stage since an earlier batch starts its
      // outcome beat now; one staged in this batch keeps the reference client's lead-in.
      const heldOnStage = staged !== null && !closesFreshReveal;
      const scene = settleSecurityClashScene(
        staged?.scene ??
          buildSecurityRevealScene({
            key,
            revealedCardId: securityCheck.revealedCardId,
            defenderSeat: securityCheck.seat,
            viewerSeat,
            attacker: securityAttackerRef.current,
          }),
        { ...securityCheck, ...(heldOnStage ? { outcomeAtMs: 0 } : {}) },
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
      if (staged?.exited !== true && (!docked || scene.resolution === "battle")) {
        enqueue({
          id: `security-clash-outcome-${key}`,
          track: CENTER_STAGE_TRACK,
          async run(context) {
            try {
              // The verdict reaches the scene here, so a card held through a long resolution
              // takes the claw at the close rather than wearing the outcome the whole time.
              // A docked card is not on stage at all, so its battle puts it back there.
              if (docked) setSecurityClash(scene);
              else setSecurityClash((current) => (current?.key === key ? scene : current));
              await context.wait(CLASH_TOTAL_MS - CLASH_OUTCOME_AT_MS);
            } finally {
              setSecurityClash((current) => (current?.key === key ? null : current));
            }
          },
        });
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
    for (const event of fresh) {
      for (const anchorId of deletionAnchorIdsFromEvent(event)) {
        // A deletion a battle dealt waits for the blow; one an announced play dealt waits
        // for the beats that explain it — the card centre-stage under its call-out, then
        // the clause that did the deleting — capped so the shatter never drifts far from
        // the board dropping the permanent.
        const delayMs = clashLoserIds.has(anchorId)
          ? FIELD_CLASH_TOTAL_MS
          : beaten.has(anchorId)
            ? COMBAT_IMPACT_TOTAL_MS
            : Math.min(playLeadInMs, PLAY_LEAD_IN_BUDGET_MS);
        const step = deleteBurstStep(anchorId, delayMs);
        if (step) enqueue(step);
      }
    }
    const openedPhase = [...fresh].reverse().find((event) => event.kind === "phaseChanged");
    if (openedPhase?.kind === "phaseChanged") {
      phaseBannerKeyRef.current += 1;
      const banner = phaseBannerFrom({
        phase: openedPhase.phase,
        turnSeat: openedPhase.turnSeat,
        viewerSeat,
        key: phaseBannerKeyRef.current,
      });
      if (banner) {
        enqueue({
          id: `phase-banner-${banner.key}`,
          track: "phaseBanner",
          replace: true,
          // It names the phase the player is now in, so it keeps its time.
          skippable: false,
          async run(context) {
            setPhaseBanner(banner);
            await context.wait(TIMINGS.phaseBanner);
            if (context.cancelled) return;
            setPhaseBanner((current) => (current?.key === banner.key ? null : current));
          },
        });
      }
    }
    const unsuspendPhase = [...fresh]
      .reverse()
      .find((event) => event.kind === "phaseChanged" && event.phase === UNSUSPEND_PHASE);
    if (unsuspendPhase?.kind === "phaseChanged") {
      unsuspendSweepKeyRef.current += 1;
      const sweep: UnsuspendSweep = { seat: unsuspendPhase.turnSeat, key: unsuspendSweepKeyRef.current };
      enqueue({
        id: `unsuspend-sweep-${sweep.key}`,
        track: "unsuspendSweep",
        replace: true,
        async run(context) {
          if (context.mode !== "live") return;
          try {
            setUnsuspendSweep(sweep);
            await context.wait(UNSUSPEND_SWEEP_MS);
          } finally {
            setUnsuspendSweep((current) => (current?.key === sweep.key ? null : current));
          }
        },
      });
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
      const transition: TurnTransitionCue = {
        endingSeat: turnEnd.endingSeat,
        nextSeat: turnEnd.nextSeat,
        turnCount: turnEnd.turnCount,
      };
      enqueue({
        id: `turn-banner-${transition.turnCount}`,
        track: "turnBanner",
        replace: true,
        skippable: false,
        async run(context) {
          setTurnTransition(transition);
          await context.wait(TIMINGS.turnBanner);
          if (context.cancelled) return;
          setTurnTransition(null);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

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
        setPendingRevealKey((current) => (current === key ? null : current));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionPending, pendingRevealKey, queue]);

  // The other end of `holdForPlayLeadIn`: the clock runs out on its own, whatever the
  // queue did or failed to do with the beats it was counting.
  useEffect(() => {
    if (playLeadInUntil === null) return;
    const release = () => setPlayLeadInUntil((current) => (current === playLeadInUntil ? null : current));
    const remaining = playLeadInUntil - Date.now();
    if (remaining <= 0) {
      release();
      return;
    }
    const timer = setTimeout(release, remaining);
    return () => clearTimeout(timer);
  }, [playLeadInUntil]);

  // One step for the whole column, holding for the soonest expiry. A second panel
  // joining shortens every remaining time, so the step is simply re-enqueued with
  // the new figure rather than each panel owning a timer.
  // The notices and panels explain what raised a decision, so their clocks stop while
  // the viewer's decision waits: whatever time the wait took is given back to each of
  // them (only the part of it they were on screen for) when it is answered.
  const holdStartRef = useRef<number | null>(null);
  useEffect(() => {
    const now = Date.now();
    if (decisionPending) {
      holdStartRef.current ??= now;
      return;
    }
    const holdStart = holdStartRef.current;
    if (holdStart === null) return;
    holdStartRef.current = null;
    const heldFor = (createdAt: number) => now - Math.max(holdStart, createdAt);
    setNotices((stack) =>
      stack.map((notice) => ({ ...notice, createdAt: notice.createdAt + heldFor(notice.createdAt) })),
    );
    setSidePanels((stack) =>
      stack.map((panel) => ({ ...panel, createdAt: panel.createdAt + heldFor(panel.createdAt) })),
    );
  }, [decisionPending]);

  useEffect(() => {
    if (sidePanels.length === 0) return;
    if (decisionPending) {
      queue.enqueue({
        id: "side-panel-expiry-held",
        track: "infoPanelExpiry",
        replace: true,
        skippable: false,
        async run() {},
      });
      return;
    }
    const remaining = nextSidePanelExpiry(sidePanels, Date.now()) ?? 0;
    queue.enqueue({
      id: `side-panel-expiry-${sidePanels.length}-${remaining}`,
      track: "infoPanelExpiry",
      replace: true,
      skippable: false,
      async run(context) {
        await context.wait(remaining);
        if (context.cancelled) return;
        setSidePanels((panels) => expireSidePanels(panels, Date.now()));
      },
    });
  }, [sidePanels, queue, decisionPending]);

  // The same shape for notices: a third one arriving shortens the whole stack.
  useEffect(() => {
    if (notices.length === 0) return;
    if (decisionPending) {
      queue.enqueue({
        id: "notice-expiry-held",
        track: "noticeExpiry",
        replace: true,
        skippable: false,
        async run() {},
      });
      return;
    }
    const remaining = nextNoticeExpiry(notices, Date.now()) ?? 0;
    queue.enqueue({
      id: `notice-expiry-${notices.length}-${remaining}`,
      track: "noticeExpiry",
      replace: true,
      // Notices carry text, so their time survives drain mode.
      skippable: false,
      async run(context) {
        await context.wait(remaining);
        if (context.cancelled) return;
        setNotices((stack) => expireNotices(stack, Date.now()));
      },
    });
  }, [notices, queue, decisionPending]);

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
    const identity = new Map<string, { cardId: string | undefined; seat: Seat }>();
    for (const player of state.players) {
      for (const permanent of player.battleArea) {
        current.set(permanent.permanentId, {
          cannotAttack: permanent.cannotAttack,
          cannotBlock: permanent.cannotBlock,
        });
        identity.set(permanent.permanentId, {
          cardId: permanent.topCard?.cardId,
          seat: permanent.controllerSeat,
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
      const frozen = identity.get(pulse.permanentId);
      const frozenCardId = frozen?.cardId;
      const frozenSide = frozen?.seat === viewerSeat ? "you" : "opp";
      queue.enqueue({
        id: `freeze-pulse-${pulse.key}`,
        // Several permanents can be locked by one resolution, so each jolts on its own
        // track rather than queueing behind another card's.
        track: `freezePulse-${pulse.permanentId}`,
        replace: true,
        async run(context) {
          if (context.mode !== "live") return;
          if (frozenCardId !== undefined) {
            setNotices((stack) =>
              pushNotice(stack, {
                id: `freeze-${pulse.key}`,
                side: frozenSide,
                fromSecurity: false,
                body: { variant: "keyword", keyword: pulse.kind, cardId: frozenCardId },
                createdAt: Date.now(),
              }),
            );
          }
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
    if (you === undefined || opp === undefined) return;
    const previous = handCountsRef.current;
    handCountsRef.current = { you: you.handCount, opp: opp.handCount };
    if (!previous || mulliganOpen) {
      turnStartDrawRef.current = { you: false, opp: false };
      return;
    }
    const turnStart = turnStartDrawRef.current;
    turnStartDrawRef.current = { you: false, opp: false };
    if (opp.handCount > previous.opp) launchDrawFlight("opp", turnStart.opp);
    if (you.handCount > previous.you) launchDrawFlight("you", turnStart.you);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [you?.handCount, opp?.handCount]);

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
    const gains = [
      { seat: viewerSeat, side: "you" as const, amount: you.securityCount - previous.you },
      { seat: otherSeat(viewerSeat), side: "opp" as const, amount: opp.securityCount - previous.opp },
    ];
    for (const { seat, side, amount } of gains) {
      if (amount <= 0) continue;
      if (securityGrowthClaimedRef.current.delete(seat)) continue;
      launchSecurityGainFlight(seat);
      noticeSequenceRef.current += 1;
      openNotice(securityGainNotice(side, amount, `notice-${noticeSequenceRef.current}`, Date.now()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [you?.securityCount, opp?.securityCount]);

  /**
   * The beat before the reveal: the defender's shield arms, its glass shatters, and the
   * board holds while the shards clear. Pure motion — the clash that follows carries the
   * information — so it is skipped outright unless the queue is live.
   */
  function shieldBreakStep(scene: SecurityBreakScene, { replace = true }: { replace?: boolean } = {}): AnimationStep {
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
  function deleteBurstStep(anchorId: string, delayMs = 0): AnimationStep | null {
    const center = anchors.permanentCenter?.(anchorId);
    if (!center) return null;
    const key = (deleteBurstKeyRef.current += 1);
    // The reference client shatters the card's own art rather than swapping it for
    // a generic puff, so the burst carries whichever card was standing there.
    const cardId = anchors.permanentCardId?.(anchorId);
    const burst: DeleteBurst = {
      key,
      x: center.x - DELETE_BURST_SIZE / 2,
      y: center.y - DELETE_BURST_SIZE / 2,
      ...(cardId ? { cardId, color: burstColorFor(cardId) } : {}),
    };
    return {
      id: `delete-burst-${key}`,
      // Several permanents can be deleted by one resolution, so each burst runs on its
      // own track instead of queueing behind the others.
      track: `deleteBurst-${key}`,
      async run(context) {
        if (context.mode !== "live") return;
        // A permanent beaten in battle takes the blow before it breaks.
        if (delayMs > 0) await context.wait(delayMs);
        if (context.cancelled) return;
        try {
          setDeleteBursts((bursts) => [...bursts, burst]);
          await context.wait(Math.max(TIMINGS.cardBurst, TIMINGS.cardShatter));
        } finally {
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
        setPermanentBursts((bursts) => new Map(bursts).set(burst.permanentId, burst));
        // The burst plays out on the permanent's own track, so the centre of the
        // screen is free for the next announcement the moment this one reveals.
        queue.enqueue({
          id: `burst-${burst.key}`,
          track: `burst-${burst.permanentId}`,
          replace: true,
          async run(burstContext) {
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
  function launchDrawFlight(side: "you" | "opp", turnStart = false) {
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
      track: `drawFlight-${key}`,
      async run(context) {
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

  return {
    sidePanels,
    dismissPanel: (id: string) => setSidePanels((panels) => dismissSidePanel(panels, id)),
    notices,
    dismissNotice: (id: string) => setNotices((stack) => dismissNotice(stack, id)),
    dismissOwnEffectNotice: (cardId: string) => {
      heldNoticesRef.current = heldNoticesRef.current.filter(
        (notice) => !(notice.side === "you" && notice.body.variant === "effect" && notice.body.cardId === cardId),
      );
      setNotices((stack) => dismissOwnEffectNotices(stack, cardId));
    },
    raiseRejection: (reason: string) => {
      noticeSequenceRef.current += 1;
      openNotice(rejectionNotice(reason, `notice-${noticeSequenceRef.current}`, Date.now()));
    },
    attackAnnouncement,
    turnTransition,
    securityClash,
    securityBreak,
    securityBranch,
    securityRevealPending: pendingRevealKey !== null,
    decisionHeldForPlay: playLeadInUntil !== null,
    unsuspendSweep,
    deleteBursts,
    zoneShowcase,
    permanentBursts,
    pendingPermanentIds,
    attackLunge,
    cutIn,
    effectSources,
    deckRiffles,
    securityFlights,
    phaseBanner,
    combatImpactIds,
    fieldClash,
    dpPulses,
    freezePulses,
    securityHitSeat,
    heldSecurityCounts,
    drawFlights,
    drawBursts,
    playCue,
    skipAnimations: () => queue.skip(),
  };
}
