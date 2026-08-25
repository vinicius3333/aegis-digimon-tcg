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
  dismissInfoPanel,
  expireInfoPanels,
  infoPanelFromEvent,
  pushInfoPanel,
  type AttackAnnouncement,
  type InfoPanel,
  type InfoPanelLookup,
} from "./infoPanels";
import { buildSecurityClashScene, type SecurityClashAttacker, type SecurityClashScene } from "./securityClash";
import { createAnimationQueue, type AnimationQueueMode, type AnimationStep } from "./animationQueue";
import { CLASH_TOTAL_MS, TIMINGS } from "./timings";

/** Card back sent from a deck pile to the hand that just grew, in board coordinates. */
export type DrawFlight = { key: number; x: number; y: number; dx: number; dy: number };

/** Must match `.game-draw-flight` in game.css. */
const DRAW_FLIGHT_WIDTH = 30;
const DRAW_FLIGHT_HEIGHT = 42;

export type AttackLunge = { permanentId: string; direction: "up" | "down" };
export type RecoveryToastCue = { seat: number; amount: number; key: number };
export type EffectNoticeCue = { cardId: string; timing?: string; description?: string; key: string };
export type TurnTransitionCue = { endingSeat: number; nextSeat: number; turnCount: number };

/** The board elements a draw flight is measured between. */
export interface MatchCueAnchors {
  board: RefObject<HTMLDivElement | null>;
  yourDeck: RefObject<HTMLDivElement | null>;
  oppDeck: RefObject<HTMLDivElement | null>;
  yourHandDock: RefObject<HTMLDivElement | null>;
  oppHandStrip: RefObject<HTMLDivElement | null>;
}

export interface MatchCues {
  infoPanels: readonly InfoPanel[];
  dismissPanel: (id: string) => void;
  attackAnnouncement: AttackAnnouncement | null;
  turnTransition: TurnTransitionCue | null;
  securityClash: SecurityClashScene | null;
  recoveryToast: RecoveryToastCue | null;
  effectNotice: EffectNoticeCue | null;
  attackLunge: AttackLunge | null;
  securityHitSeat: number | null;
  drawFlights: readonly DrawFlight[];
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

function documentHidden(): boolean {
  return typeof document !== "undefined" && document.hidden === true;
}

function liveMode(): AnimationQueueMode {
  return prefersReducedMotion() || documentHidden() ? "drain" : "live";
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

  const [infoPanels, setInfoPanels] = useState<readonly InfoPanel[]>([]);
  const [attackAnnouncement, setAttackAnnouncement] = useState<AttackAnnouncement | null>(null);
  const [turnTransition, setTurnTransition] = useState<TurnTransitionCue | null>(null);
  const [securityClash, setSecurityClash] = useState<SecurityClashScene | null>(null);
  const [recoveryToast, setRecoveryToast] = useState<RecoveryToastCue | null>(null);
  const [effectNotice, setEffectNotice] = useState<EffectNoticeCue | null>(null);
  const [attackLunge, setAttackLunge] = useState<AttackLunge | null>(null);
  const [securityHitSeat, setSecurityHitSeat] = useState<number | null>(null);
  const [drawFlights, setDrawFlights] = useState<readonly DrawFlight[]>([]);

  // Cues are observed twice for your own actions (the intent handler fires one
  // immediately, the server echo arrives later), so repeats are suppressed.
  const cuePlayedAtRef = useRef<CueTimestamps>({});
  const cueBaselineRef = useRef(false);
  const lastCueEventRef = useRef<ServerEvent | undefined>(undefined);
  const infoPanelSequenceRef = useRef(0);
  // `cardsMoved` names only instance ids, so the panels need the board's current
  // identity and ownership index to name the cards that just moved.
  const infoLookupRef = useRef<InfoPanelLookup>({ cardId: () => undefined, seat: () => undefined });
  // The card the checked player is defending against. A security check carries no
  // attacker, so it is remembered from the attack that opened the check.
  const securityAttackerRef = useRef<SecurityClashAttacker | undefined>(undefined);
  const securityClashKeyRef = useRef(0);
  const drawFlightKeyRef = useRef(0);
  const handCountsRef = useRef<{ you: number; opp: number } | null>(null);

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
    infoLookupRef.current = { cardId: (id) => cardIds.get(id), seat: (id) => seats.get(id) };
  });

  useEffect(() => {
    const previous = lastCueEventRef.current;
    const fresh = eventsAfter(events, previous);
    lastCueEventRef.current = events.at(-1);
    const rejection = [...fresh].reverse().find((event) => event.kind === "actionRejected");
    const securityCheck = [...fresh].reverse().find((event) => event.kind === "securityChecked");
    const recovery = [...fresh].reverse().find((event) => event.kind === "securityRecovered");
    const resolvedEffect = [...fresh]
      .reverse()
      .find((event) => event.kind === "effectResolved" && event.seat === viewerSeat);
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

    if (!replayingHistory) {
      for (const event of fresh) {
        const cue = soundForEvent(event, viewerSeat);
        if (cue) playCue(cue);
      }
      const now = Date.now();
      let announcement: AttackAnnouncement | null = null;
      const opened: InfoPanel[] = [];
      for (const event of fresh) {
        infoPanelSequenceRef.current += 1;
        const id = `info-panel-${infoPanelSequenceRef.current}`;
        const panel = infoPanelFromEvent(event, viewerSeat, infoLookupRef.current, id, now);
        if (panel) opened.push(panel);
        announcement = attackAnnouncementFromEvent(event, viewerSeat, id, now) ?? announcement;
      }
      if (opened.length > 0) {
        setInfoPanels((panels) =>
          opened.reduce<readonly InfoPanel[]>(
            (stack, panel) => pushInfoPanel(stack, panel),
            expireInfoPanels(panels, now),
          ),
        );
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
      securityAttackerRef.current = { seat: securityAttack.seat, cardId: securityAttack.attackerCardId };
    }
    if (securityCheck?.kind === "securityChecked") {
      securityClashKeyRef.current += 1;
      const scene = buildSecurityClashScene({
        key: securityClashKeyRef.current,
        revealedCardId: securityCheck.revealedCardId,
        resolution: securityCheck.resolution,
        defenderSeat: securityCheck.seat,
        viewerSeat,
        attacker: securityAttackerRef.current,
      });
      enqueue({
        id: `security-clash-${scene.key}`,
        track: "securityClash",
        replace: true,
        // The revealed card has to stay readable, motion preference or not.
        skippable: false,
        async run(context) {
          setSecurityClash(scene);
          await context.wait(CLASH_TOTAL_MS);
          if (context.cancelled) return;
          setSecurityClash(null);
        },
      });
      const hitSeat = securityCheck.seat;
      enqueue({
        id: `security-hit-${scene.key}`,
        track: "securityHit",
        replace: true,
        async run(context) {
          setSecurityHitSeat(hitSeat);
          await context.wait(TIMINGS.securityHit);
          if (context.cancelled) return;
          setSecurityHitSeat(null);
        },
      });
    }
    if (recovery?.kind === "securityRecovered") {
      const toast: RecoveryToastCue = { seat: recovery.seat, amount: recovery.amount, key: Date.now() };
      enqueue({
        id: `recovery-${toast.key}`,
        track: "recoveryToast",
        replace: true,
        skippable: false,
        async run(context) {
          setRecoveryToast(toast);
          await context.wait(TIMINGS.recoveryToast);
          if (context.cancelled) return;
          setRecoveryToast(null);
        },
      });
    }
    if (resolvedEffect?.kind === "effectResolved") {
      const notice: EffectNoticeCue = {
        cardId: resolvedEffect.sourceCardId,
        timing: resolvedEffect.timing,
        description: resolvedEffect.description,
        key: `${resolvedEffect.effectKey}-${events.length}`,
      };
      enqueue({
        id: `effect-notice-${notice.key}`,
        track: "effectNotice",
        replace: true,
        skippable: false,
        async run(context) {
          setEffectNotice(notice);
          await context.wait(TIMINGS.effectNotice);
          if (context.cancelled) return;
          setEffectNotice(null);
        },
      });
    }
    if (turnEnd?.kind === "turnEnded") {
      securityAttackerRef.current = undefined;
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

  // One step for the whole stack, holding for the oldest panel's remaining lifetime.
  useEffect(() => {
    if (infoPanels.length === 0) return;
    const oldest = Math.min(...infoPanels.map((panel) => panel.createdAt));
    const remaining = Math.max(0, oldest + TIMINGS.infoPanelLifetime - Date.now());
    queue.enqueue({
      id: `info-panel-expiry-${oldest}`,
      track: "infoPanelExpiry",
      replace: true,
      skippable: false,
      async run(context) {
        await context.wait(remaining);
        if (context.cancelled) return;
        setInfoPanels((panels) => expireInfoPanels(panels, Date.now()));
      },
    });
  }, [infoPanels, queue]);

  // A hand that grew was drawn into. The opening hand and a mulligan redeal are
  // not draws, so the first observed pair is only a baseline.
  const you = state?.players[viewerSeat];
  const opp = state?.players[otherSeat(viewerSeat)];
  useEffect(() => {
    if (you === undefined || opp === undefined) return;
    const previous = handCountsRef.current;
    handCountsRef.current = { you: you.handCount, opp: opp.handCount };
    if (!previous || mulliganOpen) return;
    if (opp.handCount > previous.opp) launchDrawFlight("opp");
    if (you.handCount > previous.you) launchDrawFlight("you");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [you?.handCount, opp?.handCount]);

  /**
   * Sends a card back from a deck pile to the hand that just grew. The reference
   * client presents a draw centre-screen; the web port keeps the deck→hand read,
   * which is what makes an opponent's draw visible at all.
   */
  function launchDrawFlight(side: "you" | "opp") {
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
      },
    });
  }

  return {
    infoPanels,
    dismissPanel: (id: string) => setInfoPanels((panels) => dismissInfoPanel(panels, id)),
    attackAnnouncement,
    turnTransition,
    securityClash,
    recoveryToast,
    effectNotice,
    attackLunge,
    securityHitSeat,
    drawFlights,
    playCue,
    skipAnimations: () => queue.skip(),
  };
}
