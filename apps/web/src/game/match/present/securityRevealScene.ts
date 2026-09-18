import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { GameState, Seat } from "@aegis/shared";
import type { AnimationQueue, AnimationStep } from "../../animationQueue";
import type { MatchNotice } from "../../notices";
import type { SidePanel } from "../../sidePanels";
import { buildSecurityBreakScene, type SecurityBranchScene, type SecurityClashScene } from "../../securityClash";
import {
  CLASH_DOCK_AT_MS,
  CLASH_OUTCOME_AT_MS,
  CLASH_REVEAL_SHOWN_AT_MS,
  CLASH_TOTAL_MS,
  SECURITY_BRANCH_IN_MS,
  SECURITY_DOCK_CLOSE_MS,
  TIMINGS,
} from "../../timings";
import { CueTrack } from "../enums";
import type { NarrationPlacement } from "../narration/narrationStream";
import type { SecurityBreakCue } from "../types";
import { shieldBreakStep } from "../steps/shieldBreakStep";
import { createPresentationGate, type PresentationGate } from "../presentationGate";

/** The revealed card `stageSecurityReveal` currently holds on stage. */
export interface RevealOnStage {
  key: number;
  scene: SecurityClashScene;
  /** True once the card has played out and left the centre of the screen on its own. */
  exited?: boolean;
  /** True while the card is parked in the side dock waiting for its check to close. */
  docked?: boolean;
}

export interface SecurityRevealSceneDeps {
  queue: AnimationQueue;
  enqueue: (step: AnimationStep) => void;
  viewerSeat: Seat;
  replayingHistory: boolean;
  batchId: string;
  revealOnStageRef: MutableRefObject<RevealOnStage | null>;
  queuedSecurityKeyRef: MutableRefObject<number | null>;
  securityDockRef: MutableRefObject<{ key: number; closed: boolean } | null>;
  securityHoldRef: MutableRefObject<{ key: number; closed: boolean; handedOver?: boolean } | null>;
  /** Mutated: armed at the reveal, released once the check's battle has been drawn. */
  securityBlowRef: MutableRefObject<{ key: number; landed: boolean; gate: PresentationGate } | null>;
  /** The board this check's battle still needs, held from the reveal until the blow lands. */
  blowHoldState: () => GameState | undefined;
  setHeldBlowState: Dispatch<SetStateAction<GameState | undefined>>;
  heldNoticesRef: MutableRefObject<readonly MatchNotice[]>;
  heldPanelsRef: MutableRefObject<readonly SidePanel[]>;
  setSecurityBreak: Dispatch<SetStateAction<SecurityBreakCue | null>>;
  setSecurityHitSeat: Dispatch<SetStateAction<number | null>>;
  setSecurityClash: Dispatch<SetStateAction<SecurityClashScene | null>>;
  setSecurityBranch: Dispatch<SetStateAction<SecurityBranchScene | null>>;
  setPendingRevealKey: Dispatch<SetStateAction<number | null>>;
  flushHeldNotices: () => void;
  openHeld: (
    ownNotices: readonly MatchNotice[],
    ownPanels: readonly SidePanel[],
    placement?: NarrationPlacement,
  ) => void;
  holdSecurityCard: (key: number, seat: Seat, count: number | undefined) => void;
  releaseSecurityCard: (key: number) => void;
  releaseSecurityCardWhenIdle: (key: number) => void;
  securityCountOf: (seat: Seat) => number | undefined;
}

/**
 * A check now reaches the client as two events: `securityRevealed` the moment the card
 * is turned face up, and `securityChecked` once the server has resolved everything that
 * card caused. The scene follows the same split — the card goes on stage at the reveal
 * and plays its scene out there. A check that closes in the same batch takes its outcome
 * beat and its detour to the side; one the server is still resolving lets the card leave
 * at the end of the scene, so its effects read out on a board with nothing on it.
 *
 * The whole check runs on the one centre-screen track, in the reference client's
 * order (battle-animation-spec.md §4b): the shield arms, its glass breaks, the card
 * is revealed and held, and only then does what the card *did* reach the screen —
 * its notice, its detour to the side, the decision it asks for. Serial order is what
 * guarantees that: a parallel track with a fixed lead-in cannot know when this one
 * actually gets to the reveal, so it can and does run ahead of it. The break carries
 * the `replace`, so a check still cancels whatever showcase was mid-flight.
 */
/** The centre-stage beats a batch can ask of the check currently holding the screen. */
export type SecurityRevealStage = ReturnType<typeof securityRevealScene>;

export function securityRevealScene(deps: SecurityRevealSceneDeps) {
  const {
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
  } = deps;

  function stageSecurityReveal(
    key: number,
    scene: SecurityClashScene,
    seat: Seat,
    { docking = false }: { docking?: boolean } = {},
  ) {
    // Only an unfinished check may be replaced. Completed checks still owed to the
    // viewer stay on the serial track, even when their events arrived in one render.
    // Armed with the reveal and released by the outcome, so anything this check deletes
    // in between waits for the blow instead of shattering over a battle not yet drawn.
    securityBlowRef.current = { key, landed: false, gate: createPresentationGate() };
    // The board as it is at the reveal — attacker suspended on the field, cards still in
    // security — is what stays on screen until that battle has been drawn.
    setHeldBlowState(blowHoldState());
    const replace = revealOnStageRef.current !== null || queuedSecurityKeyRef.current === null;
    if (revealOnStageRef.current !== null) flushHeldNotices();
    queuedSecurityKeyRef.current = key;
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
      shieldBreakStep({
        queue,
        setSecurityBreak,
        setSecurityHitSeat,
        scene: buildSecurityBreakScene({ key, defenderSeat: seat, viewerSeat }),
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
      track: CueTrack.CenterStage,
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
      track: CueTrack.CenterStage,
      // It carries the revealed card, which is the one thing on screen worth reading.
      skippable: false,
      async run(context) {
        setSecurityBranch(dock);
        await context.wait(SECURITY_BRANCH_IN_MS);
        if (context.cancelled) return;
        // Docked and legible: the card's OWN clause may be read out now, and the decision
        // it asks for may open beside it — the reference client opens its panel here.
        // Only its own: anything a card it went on to play caused belongs to a later cue.
        openHeld(own.notices, own.panels, { next: true });
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
      track: CueTrack.SecurityDock,
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
      track: CueTrack.CenterStage,
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
      track: CueTrack.CenterStage,
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
      track: CueTrack.SecurityHold,
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
      track: CueTrack.CenterStage,
      skippable: false,
      run() {
        openHeld(notices, panels, { next: true });
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
      track: CueTrack.CenterStage,
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

  return {
    stageSecurityReveal,
    releaseSecurityBlow,
    dockSecurityReveal,
    undockSecurityReveal,
    clearSecurityReveal,
    holdSecurityReveal,
    readOutSecurityNotices,
    releaseSecurityPresentation,
    presentSecurityReveal,
  };
}
