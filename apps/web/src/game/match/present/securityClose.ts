import { waitForSecurityBattleClock } from "../../cardShatterClock";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import type { MatchNotice } from "../../notices";
import type { SidePanel } from "../../sidePanels";
import {
  buildSecurityDockScene,
  buildSecurityRevealScene,
  settleSecurityClashScene,
  securityClashTailMs,
  type SecurityClashAttacker,
  type SecurityClashScene,
} from "../../securityClash";
import { CLASH_OUTCOME_AT_MS, TIMINGS } from "../../timings";
import { CueTrack } from "../enums";
import type { RevealOnStage } from "../types";
import type { SecurityRevealStage } from "./securityRevealScene";
import { exitSecurityCard } from "./securityCardExit";

/**
 * The close of a security check: the outcome beat, the card's detour to the side of the
 * screen, and the board handed back.
 *
 * A close with no reveal on stage is a client that joined mid-check (reconnect replay) or an
 * older server, so the finished scene is staged now — the card is still shown before its
 * outcome. Everything else here turns on where the card already is: a scene that has been
 * holding it since an earlier batch starts its outcome beat immediately, one staged in this
 * batch keeps the reference client's lead-in, and a card the stage already let go of is put
 * back only for a battle, which is the one outcome that needs the attacker beside it.
 */
export function presentSecurityClose({
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
  stage,
  enqueueDeferredSecurityArrivals,
  enqueue,
}: {
  securityCheck: Extract<ServerEvent, { kind: "securityChecked" }>;
  /** The same event when this batch also carried the reveal it closes. */
  closingCheck: Extract<ServerEvent, { kind: "securityChecked" }> | undefined;
  /** True when the reveal this close settles was staged in this same batch. */
  closesFreshReveal: boolean;
  viewerSeat: Seat;
  heldNotices: readonly MatchNotice[];
  heldPanels: readonly SidePanel[];
  /** Mutated: incremented only when the close has to stage a scene of its own. */
  securityClashKeyRef: MutableRefObject<number>;
  securityAttackerRef: MutableRefObject<SecurityClashAttacker | undefined>;
  /** Mutated: the battle hold is marked closed, and the poll that owns it drops it. */
  securityHoldRef: MutableRefObject<{ key: number; closed: boolean; handedOver?: boolean } | null>;
  /** Mutated: cleared, the card on stage now being this close's to finish with. */
  revealOnStageRef: MutableRefObject<RevealOnStage | null>;
  heldNoticesRef: MutableRefObject<readonly MatchNotice[]>;
  heldPanelsRef: MutableRefObject<readonly SidePanel[]>;
  setSecurityClash: Dispatch<SetStateAction<SecurityClashScene | null>>;
  stage: SecurityRevealStage;
  enqueueDeferredSecurityArrivals: (key: number) => void;
  enqueue: (step: AnimationStep) => void;
}) {
  const staged = revealOnStageRef.current;
  const key = staged?.key ?? (securityClashKeyRef.current += 1);
  // The verdict is here, so the hold that was waiting for it releases the card. Marked rather
  // than cleared: the poll owns the ref and drops it as it returns.
  const heldForBattle = securityHoldRef.current;
  if (heldForBattle?.key === key) heldForBattle.closed = true;
  const heldOnStage = staged !== null && !closesFreshReveal;
  // A card the hold let go of is not on stage any more, however long it held before it gave
  // up. Its battle is staged again from nothing, so it needs the whole lead-in — the attacker
  // taking its place, the reveal, the hold — rather than the outcome beat a card still
  // standing there would take. Without this the blow lands in the short tail on a card the
  // viewer never saw arrive.
  const restagedBattle = staged?.exited === true && securityCheck.resolution === "battle";
  const settled = settleSecurityClashScene(
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
  const scene = staged?.docked && settled.resolution === "battle" ? { ...settled, revealedReady: true } : settled;
  const staging = staged === null;
  const closedEffectDock = scene.resolution === "effect" && (staging || closesFreshReveal);
  const docked = staged?.docked === true || closedEffectDock;
  if (staging) {
    stage.stageSecurityReveal(key, scene, securityCheck.seat, {
      docking: closedEffectDock,
      battlePending: scene.resolution === "battle" && scene.attacker !== undefined,
    });
    heldNoticesRef.current = [...heldNoticesRef.current, ...heldNotices];
    heldPanelsRef.current = [...heldPanelsRef.current, ...heldPanels];
    if (closedEffectDock) {
      stage.dockSecurityReveal(
        key,
        buildSecurityDockScene({
          key,
          revealedCardId: securityCheck.revealedCardId,
          revealedArtId: securityCheck.artId,
          defenderSeat: securityCheck.seat,
          viewerSeat,
        }),
        { notices: heldNotices, panels: heldPanels },
      );
    }
  }
  revealOnStageRef.current = null;
  // The docked card leaves first, so the outcome — when there is one to show — plays on a
  // board it has already handed back.
  if (docked && !closedEffectDock) stage.undockSecurityReveal(key);
  // A live server can finish the battle after removal reactions have already let the reveal
  // leave. Its battle still needs both cards on centre stage.
  const restoreBattle = scene.resolution === "battle" && (docked || staged?.exited === true);
  if (restoreBattle || (staged?.exited !== true && !docked)) {
    enqueue({
      id: `security-clash-outcome-${key}`,
      track: CueTrack.CenterStage,
      async run(context) {
        try {
          // The verdict reaches the scene here, so a card held through a long resolution
          // takes the claw at the close rather than wearing the outcome the whole time. A
          // docked card is not on stage at all, so its battle puts it back there.
          const ownedScene = { ...scene, lightOwner: { context, enqueue } };
          if (restoreBattle) setSecurityClash(ownedScene);
          else setSecurityClash((current) => (current?.key === key ? ownedScene : current));
          if (restagedBattle) await context.wait(CLASH_OUTCOME_AT_MS);
          const tailMs = securityClashTailMs(scene);
          if (scene.cause === "destruction") await context.wait(tailMs);
          else {
            // The claw and its settle finish before the checked card narrows and rises.
            // A no-battle check has already spent its recognition hold at the reveal.
            await context.wait(scene.resolution === "battle" ? TIMINGS.clashOutcome : 0);
            if (scene.resolution === "battle") await waitForSecurityBattleClock(key, context);
            if (context.cancelled) return;
            await exitSecurityCard({ key, context, setSecurityClash, shatter: scene.loser?.attacker === true });
          }
        } finally {
          setSecurityClash((current) => (current?.key === key ? null : current));
          stage.releaseSecurityBlow(key);
        }
      },
    });
  } else {
    // No outcome beat to wait for — the check closed on something with no battle to
    // draw — so nothing it deleted should keep waiting on one.
    stage.releaseSecurityBlow(key);
  }
  // When the reveal and close arrive in one batch, the security card must visibly reach the
  // right-hand execution slot before a Tamer it played enters the field.
  if (closingCheck || closedEffectDock) enqueueDeferredSecurityArrivals(key);
  // A close delivered with its reveal does not change the visual order: dock, read
  // the security clause, present its arrivals, then close. It also must not publish
  // the same clause again through the former settled-branch fallback.
  if (closedEffectDock) stage.undockSecurityReveal(key);
  // A reveal already on stage has read out its notices; only a scene staged straight from the
  // close still owes them. The board comes back either way: a check that ran long has been
  // holding it since the reveal.
  if (!closedEffectDock && (closesFreshReveal || staging)) stage.presentSecurityReveal(key);
  else stage.releaseSecurityPresentation(key);
}
