import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import type { MatchNotice } from "../../notices";
import type { SidePanel } from "../../sidePanels";
import {
  buildSecurityBranchScene,
  buildSecurityRevealScene,
  settleSecurityClashScene,
  SECURITY_BRANCH_TOTAL_MS,
  type SecurityBranchScene,
  type SecurityClashAttacker,
  type SecurityClashScene,
} from "../../securityClash";
import { CLASH_OUTCOME_AT_MS, CLASH_TOTAL_MS, SECURITY_BRANCH_IN_MS } from "../../timings";
import { CueTrack } from "../enums";
import type { RevealOnStage } from "../types";
import type { SecurityRevealStage } from "./securityRevealScene";

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
  setSecurityBranch,
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
  setSecurityBranch: Dispatch<SetStateAction<SecurityBranchScene | null>>;
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
  // standing there would take. Without this the blow lands in the 510 ms tail on a card the
  // viewer never saw arrive.
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
    stage.stageSecurityReveal(key, scene, securityCheck.seat);
    heldNoticesRef.current = [...heldNoticesRef.current, ...heldNotices];
    heldPanelsRef.current = [...heldPanelsRef.current, ...heldPanels];
  }
  revealOnStageRef.current = null;
  // The detour to the side of the screen belongs to a card whose effect has not been seen
  // yet. A card that already held the centre of the screen through its own resolution has
  // been seen, so it takes the outcome beat and leaves.
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
  // The docked card leaves first, so the outcome — when there is one to show — plays on a
  // board it has already handed back.
  if (docked) stage.undockSecurityReveal(key);
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
          if (restoreBattle) setSecurityClash(scene);
          else setSecurityClash((current) => (current?.key === key ? scene : current));
          await context.wait(restagedBattle ? CLASH_TOTAL_MS : CLASH_TOTAL_MS - CLASH_OUTCOME_AT_MS);
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
  // Step 10b: the revealed card takes its place at the side of the screen BEFORE its clause is
  // read out, so the notice lands beside the card it explains rather than ahead of it (the
  // reference client flies the card to the execute zone, then opens the panel). A check that
  // resolves no effect has no detour, so its notices follow the outcome directly.
  if (branch) {
    // The slide itself is decoration, so a click through the scene collapses it and the card
    // simply appears at the side.
    enqueue({
      id: `security-branch-in-${key}`,
      track: CueTrack.CenterStage,
      async run(context) {
        setSecurityBranch(branch);
        await context.wait(SECURITY_BRANCH_IN_MS);
      },
    });
  }
  // When the reveal and close arrive in one batch, the security card must visibly reach the
  // right-hand execution slot before a Tamer it played enters the field.
  if (closingCheck) enqueueDeferredSecurityArrivals(key);
  // A reveal already on stage has read out its notices; only a scene staged straight from the
  // close still owes them. The board comes back either way: a check that ran long has been
  // holding it since the reveal.
  if (closesFreshReveal || staging) stage.presentSecurityReveal(key);
  else stage.releaseSecurityPresentation(key);
  if (branch) {
    enqueue({
      id: `security-branch-${key}`,
      track: CueTrack.CenterStage,
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
