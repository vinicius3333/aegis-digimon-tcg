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
  effectNoticeFromEvent,
  expireNotices,
  keywordNoticeFromEvent,
  nextNoticeExpiry,
  pushNotice,
  recoveryNoticeFromEvent,
  rejectionNotice,
  type MatchNotice,
} from "./notices";
import {
  buildSecurityBranchScene,
  buildSecurityBreakScene,
  buildSecurityClashScene,
  SECURITY_BRANCH_TOTAL_MS,
  SECURITY_BREAK_TIMINGS,
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
import { phaseBannerFrom, type PhaseBanner } from "./phaseBanner";
import { dpPulses as diffDpPulses, type DpPulse } from "./dpPulse";
import { freezePulses as diffFreezePulses, type FreezeFlags, type FreezePulse } from "./freezePulse";
import {
  CLASH_OUTCOME_AT_MS,
  CLASH_TOTAL_MS,
  COMBAT_IMPACT_TOTAL_MS,
  cutInTotalMs,
  dpPulseTotalMs,
  SHOWCASE_TOTAL_MS,
  TIMINGS,
} from "./timings";
import type { ColorName } from "../design/theme";

/** Card back sent from a deck pile to the hand that just grew, in board coordinates. */
export type DrawFlight = { key: number; x: number; y: number; dx: number; dy: number };

/** Must match `.game-draw-flight` in game.css. */
const DRAW_FLIGHT_WIDTH = 30;
const DRAW_FLIGHT_HEIGHT = 42;

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
   */
  securityRevealPending: boolean;
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
  /** The DP change each permanent is currently pulsing over, by permanent id. */
  dpPulses: ReadonlyMap<string, DpPulse>;
  /** The attack/block lock each permanent is currently jolting over, by permanent id. */
  freezePulses: ReadonlyMap<string, FreezePulse>;
  securityHitSeat: number | null;
  drawFlights: readonly DrawFlight[];
  drawBursts: readonly DrawBurst[];
  /** Plays a cue for a locally triggered action, sharing the repeat suppression with the event fan-out. */
  playCue: (kind: SoundKind) => void;
  /** Fast-forward the decorative cues currently in flight. */
  skipAnimations: () => void;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
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
    for (const card of [...(player.deck ?? []), ...(player.eggDeck ?? [])]) {
      if (card?.instanceId) seats.set(card.instanceId, seat);
    }
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
  anchors,
  onActionRejected,
}: {
  events: readonly ServerEvent[];
  state: GameState | undefined;
  viewerSeat: Seat;
  /** The opening hand and a mulligan redeal are dealt, not drawn. */
  mulliganOpen: boolean;
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
  const [securityBranch, setSecurityBranch] = useState<SecurityBranchScene | null>(null);
  // The check whose reveal the screen still owes the viewer, by clash key.
  const [pendingRevealKey, setPendingRevealKey] = useState<number | null>(null);
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
  // True while the held notices came in AHEAD of their `securityChecked` — the server
  // announces a check's effects before the event that closes the check, and a decision
  // inside the effect splits the two across batches. The check that arrives next owns
  // them, so it must not flush them as a superseded check's leftovers.
  const heldAwaitingCheckRef = useRef(false);
  // `cardsMoved` names only instance ids, so the panels need the board's current
  // identity and ownership index to name the cards that just moved.
  const sidePanelLookupRef = useRef<SidePanelLookup>({ cardId: () => undefined, seat: () => undefined });
  // The card the checked player is defending against. A security check carries no
  // attacker, so it is remembered from the attack that opened the check.
  const securityAttackerRef = useRef<SecurityClashAttacker | undefined>(undefined);
  const securityClashKeyRef = useRef(0);
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

  function openNotice(notice: MatchNotice) {
    setNotices((stack) => pushNotice(expireNotices(stack, notice.createdAt), notice));
  }

  /** Raises whatever a security check has still not said, on the clock it is raised at. */
  function flushHeldNotices() {
    const held = heldNoticesRef.current;
    heldNoticesRef.current = [];
    heldAwaitingCheckRef.current = false;
    if (held.length === 0) return;
    for (const notice of held) openNotice({ ...notice, createdAt: Date.now() });
  }

  useEffect(() => {
    const previous = lastCueEventRef.current;
    const fresh = eventsAfter(events, previous);
    lastCueEventRef.current = events.at(-1);
    const rejection = [...fresh].reverse().find((event) => event.kind === "actionRejected");
    const securityCheck = [...fresh].reverse().find((event) => event.kind === "securityChecked");
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
    // Notices a security check owns. They read as what the revealed card did, so they
    // are handed to the centre-stage sequence below instead of being raised here, where
    // they would talk over — or ahead of — the reveal they describe.
    let heldNotices: readonly MatchNotice[] = [];
    // The ones the server itself stamped as fired mid-check. Their `securityChecked`
    // may not even be in this batch yet — a decision inside the effect splits the two —
    // so they are held for the check that arrives, this pass or a later one.
    const checkOwnedNotices: MatchNotice[] = [];

    if (!replayingHistory) {
      for (const event of fresh) {
        const cue = soundForEvent(event, viewerSeat);
        if (cue) playCue(cue);
      }
      const now = Date.now();
      let announcement: AttackAnnouncement | null = null;
      const opened: SidePanel[] = [];
      const raised: MatchNotice[] = [];
      // The centre-stage showcase runs only in `live` mode, so under reduced motion or a
      // hidden tab the panel is the only thing left to announce an opponent's arrival.
      const showcasePlays = queue.getMode() === "live";
      for (const event of fresh) {
        sidePanelSequenceRef.current += 1;
        const id = `side-panel-${sidePanelSequenceRef.current}`;
        const panel = sidePanelFromEvent(event, viewerSeat, sidePanelLookupRef.current, id, now, showcasePlays);
        if (panel) opened.push(panel);
        announcement = attackAnnouncementFromEvent(event, viewerSeat, id, now) ?? announcement;
        // A security card that resolves an effect owns the next notice, which is
        // why the flag is read here rather than derived from the event alone.
        if (event.kind === "securityChecked") securityEffectPendingRef.current = event.resolution === "effect";
        noticeSequenceRef.current += 1;
        const noticeId = `notice-${noticeSequenceRef.current}`;
        const notice =
          effectNoticeFromEvent(event, viewerSeat, noticeId, now, securityEffectPendingRef.current) ??
          recoveryNoticeFromEvent(event, viewerSeat, noticeId, now) ??
          keywordNoticeFromEvent(event, viewerSeat, noticeId, now);
        if (notice) {
          if (notice.body.variant === "effect") securityEffectPendingRef.current = false;
          // An effect the server marked as fired mid-check announces a card the viewer
          // has not been shown yet, so it never talks ahead of the reveal it describes.
          if (event.kind === "effectTriggered" && event.duringSecurityCheck === true) {
            checkOwnedNotices.push(notice);
          } else {
            raised.push(notice);
          }
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
        enqueue({
          id: `cut-in-${announced.key}`,
          track: CENTER_STAGE_TRACK,
          replace: true,
          async run(context) {
            if (context.mode !== "live") return;
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
      let showcased = false;
      for (const event of fresh) {
        showcaseKeyRef.current += 1;
        const key = showcaseKeyRef.current;
        const showcase = zoneShowcaseFromEvent(event, viewerSeat, key);
        const burst = permanentBurstFromEvent(event, key);
        if (!showcase && !burst) continue;
        showcased ||= showcase !== null;
        enqueue(zoneChangeStep(key, showcase, burst));
      }
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
      // A recovered card flies back onto the stack it joined.
      for (const event of fresh) {
        if (event.kind !== "securityRecovered") continue;
        const seat = event.seat;
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
      if (opened.length > 0) {
        setSidePanels((panels) =>
          opened.reduce<readonly SidePanel[]>(
            (stack, panel) => pushSidePanel(stack, panel),
            expireSidePanels(panels, now),
          ),
        );
      }
      // An On Play / When Digivolving notice reads as the consequence of the card
      // that was just announced, so it waits for the reveal instead of talking
      // over the showcase. Its clock starts when it is finally raised.
      if (securityCheck && raised.length > 0) {
        heldNotices = raised;
      } else if (showcased && raised.length > 0) {
        enqueue({
          id: `showcase-notices-${showcaseKeyRef.current}`,
          track: CENTER_STAGE_TRACK,
          skippable: false,
          run() {
            for (const notice of raised) openNotice({ ...notice, createdAt: Date.now() });
          },
        });
      } else {
        for (const notice of raised) openNotice(notice);
      }
      // A check-owned notice whose check is not in this batch waits for the
      // `securityChecked` that closes it. The flag marks the held stack as belonging
      // to the check that arrives next, not to a superseded one.
      if (!securityCheck && checkOwnedNotices.length > 0) {
        heldNoticesRef.current = [...heldNoticesRef.current, ...checkOwnedNotices];
        heldAwaitingCheckRef.current = true;
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
    if (securityCheck?.kind === "securityChecked") {
      securityClashKeyRef.current += 1;
      const key = securityClashKeyRef.current;
      const scene = buildSecurityClashScene({
        key,
        revealedCardId: securityCheck.revealedCardId,
        resolution: securityCheck.resolution,
        defenderSeat: securityCheck.seat,
        viewerSeat,
        attacker: securityAttackerRef.current,
        ...(securityCheck.battle ? { battle: securityCheck.battle } : {}),
      });
      const breakScene = buildSecurityBreakScene({ key, defenderSeat: securityCheck.seat, viewerSeat });
      const branch = buildSecurityBranchScene({
        key,
        revealedCardId: securityCheck.revealedCardId,
        resolution: securityCheck.resolution,
        defenderSeat: securityCheck.seat,
        viewerSeat,
      });
      // The whole check runs on the one centre-screen track, in the reference client's
      // order (battle-animation-spec.md §4b): the shield arms, its glass breaks, the card
      // is revealed and held, and only then does what the card *did* reach the screen —
      // its notice, its detour to the side, the decision it asks for. Serial order is what
      // guarantees that: a parallel track with a fixed lead-in cannot know when this one
      // actually gets to the reveal, so it can and does run ahead of it. The break carries
      // the `replace`, so a check still cancels whatever showcase was mid-flight.
      // Whatever the check it cancels had not said yet is said now, before it goes —
      // unless the held stack is this very check's own notices, arrived ahead of it.
      if (!heldAwaitingCheckRef.current) flushHeldNotices();
      enqueue(shieldBreakStep(breakScene));
      // Everything the check will present is held back from here until the reveal has
      // been seen. Cleared by the outcome step below, and by the queue going idle in
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
          setSecurityClash(scene);
          await context.wait(CLASH_OUTCOME_AT_MS);
          if (context.cancelled) setSecurityClash((current) => (current?.key === scene.key ? null : current));
        },
      });
      enqueue({
        id: `security-clash-outcome-${key}`,
        track: CENTER_STAGE_TRACK,
        async run(context) {
          try {
            await context.wait(CLASH_TOTAL_MS - CLASH_OUTCOME_AT_MS);
          } finally {
            setSecurityClash((current) => (current?.key === scene.key ? null : current));
            setPendingRevealKey((current) => (current === key ? null : current));
          }
        },
      });
      heldNoticesRef.current = [...heldNoticesRef.current, ...heldNotices, ...checkOwnedNotices];
      heldAwaitingCheckRef.current = false;
      // Step 10b: the card has been shown, so now it can be read out. The clock on
      // each notice starts here rather than when the server named it. Always queued —
      // it also reads out check-owned notices that arrive while the scene still plays.
      enqueue({
        id: `security-notices-${key}`,
        track: CENTER_STAGE_TRACK,
        skippable: false,
        run() {
          flushHeldNotices();
        },
      });
      if (branch) {
        // The card detours to the half of the screen the side panels leave free, next
        // to the notice raised a beat earlier, and the centre of the board is given back.
        enqueue({
          id: `security-branch-${key}`,
          track: CENTER_STAGE_TRACK,
          // It holds the revealed card next to the notice that explains it.
          skippable: false,
          async run(context) {
            try {
              setSecurityBranch(branch);
              await context.wait(SECURITY_BRANCH_TOTAL_MS);
            } finally {
              setSecurityBranch((current) => (current?.key === branch.key ? null : current));
            }
          },
        });
      }
      // A cue that never reached the screen must not leave the check's presentation
      // held back for good, so the flag is dropped at the latest when nothing is running.
      if (!replayingHistory) {
        void queue.idle().then(() => setPendingRevealKey((current) => (current === key ? null : current)));
      }
    }
    // A permanent that lost a battle takes the claw and the shake first, and its
    // burst waits behind them — the reference client hits the card, then breaks
    // it. Only combat deletions get the impact; an effect deletion has no blow
    // to land.
    const beaten = new Set<string>();
    for (const event of fresh) {
      if (event.kind !== "combatResolved") continue;
      for (const permanentId of event.deletedPermanentIds) beaten.add(permanentId);
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
        const step = deleteBurstStep(anchorId, beaten.has(anchorId) ? COMBAT_IMPACT_TOTAL_MS : 0);
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
      // No check survives its turn: anything still held has no reveal left to wait
      // for. A check observed this pass still owns its queued flush, so it keeps it.
      if (!securityCheck) flushHeldNotices();
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

  // One step for the whole column, holding for the soonest expiry. A second panel
  // joining shortens every remaining time, so the step is simply re-enqueued with
  // the new figure rather than each panel owning a timer.
  useEffect(() => {
    if (sidePanels.length === 0) return;
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
  }, [sidePanels, queue]);

  // The same shape for notices: a third one arriving shortens the whole stack.
  useEffect(() => {
    if (notices.length === 0) return;
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
  }, [notices, queue]);

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

  /**
   * The beat before the reveal: the defender's shield arms, its glass shatters, and the
   * board holds while the shards clear. Pure motion — the clash that follows carries the
   * information — so it is skipped outright unless the queue is live.
   */
  function shieldBreakStep(scene: SecurityBreakScene): AnimationStep {
    return {
      id: `security-break-${scene.key}`,
      track: CENTER_STAGE_TRACK,
      // The check owns the centre of the screen from here, so whatever was being
      // announced there gives way at the break rather than during the reveal.
      replace: true,
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
  function zoneChangeStep(key: number, showcase: ZoneShowcase | null, burst: PermanentBurst | null): AnimationStep {
    return {
      id: `zone-change-${key}`,
      track: CENTER_STAGE_TRACK,
      async run(context) {
        if (context.mode !== "live") return;
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
      x: sourceRect.left + sourceRect.width / 2 - boardRect.left - DRAW_FLIGHT_WIDTH / 2,
      y: sourceRect.top + sourceRect.height / 2 - boardRect.top - DRAW_FLIGHT_HEIGHT / 2,
    };
    const to = {
      x: targetRect.left + targetRect.width / 2 - boardRect.left - DRAW_FLIGHT_WIDTH / 2,
      y: targetRect.top + targetRect.height / 2 - boardRect.top - DRAW_FLIGHT_HEIGHT / 2,
    };
    const key = (drawFlightKeyRef.current += 1);
    const flight: DrawFlight = { key, x: from.x, y: from.y, dx: to.x - from.x, dy: to.y - from.y };
    // Two hands can grow at once, so each flight gets a track of its own rather
    // than queueing behind the other side's.
    queue.enqueue({
      id: `draw-flight-${key}`,
      track: `drawFlight-${key}`,
      async run(context) {
        setDrawFlights((flights) => [...flights, flight]);
        await context.wait(TIMINGS.drawFlight);
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
    dpPulses,
    freezePulses,
    securityHitSeat,
    drawFlights,
    drawBursts,
    playCue,
    skipAnimations: () => queue.skip(),
  };
}
