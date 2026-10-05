import type { MutableRefObject } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { MatchNotice } from "../../notices";
import type { SidePanel } from "../../sidePanels";
import {
  buildSecurityDockScene,
  buildSecurityRevealScene,
  settleSecurityClashScene,
  type SecurityClashAttacker,
} from "../../securityClash";
import type { RevealOnStage } from "../types";
import type { SecurityRevealStage } from "./securityRevealScene";

/**
 * Shows the security card before presenting its consequences. Effects transfer into
 * the existing side dock and read their own clauses there, whether the close arrives
 * now or in a later batch. A battle keeps its separate outcome beat and board hold.
 */
export function presentSecurityRevealed({
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
}: {
  securityReveal: Extract<ServerEvent, { kind: "securityRevealed" }>;
  /** The close this same batch carries, when it has one. */
  closingCheck: Extract<ServerEvent, { kind: "securityChecked" }> | undefined;
  viewerSeat: Seat;
  heldNotices: readonly MatchNotice[];
  heldPanels: readonly SidePanel[];
  /** Mutated: incremented so this reveal gets its own scene key. */
  securityClashKeyRef: MutableRefObject<number>;
  securityAttackerRef: MutableRefObject<SecurityClashAttacker | undefined>;
  /** Mutated: what this reveal leaves on stage for the close to find. */
  revealOnStageRef: MutableRefObject<RevealOnStage | null>;
  heldNoticesRef: MutableRefObject<readonly MatchNotice[]>;
  heldPanelsRef: MutableRefObject<readonly SidePanel[]>;
  stage: SecurityRevealStage;
  enqueueDeferredSecurityArrivals: (key: number) => void;
}) {
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
  // A same-batch verdict supplies the scene resolution before it starts. The effect
  // path still shares the reveal, continuous transfer and clause read of a pending check.
  const settled = closingCheck ? settleSecurityClashScene(revealed, closingCheck) : revealed;
  // The server names what the card is about to do, so the client can commit to the dock at
  // the reveal rather than guessing from the close that has not arrived. An older server (or
  // a replayed history) sends no hint, and falls back to the centre-stage scene that plays
  // itself out.
  const docking = closingCheck ? closingCheck.resolution === "effect" : securityReveal.hasSecurityEffect === true;
  // Whether a battle will actually be drawn for this check. Only then is there a blow for
  // the deletions it causes to wait on, and only then is the reveal-time board worth
  // holding. A revealed Option or Tamer never battles, so its check — which for a
  // [Security] effect runs until the viewer has answered every question it asks — must
  // arm neither.
  const battlePending =
    (closingCheck ? closingCheck.resolution === "battle" : securityReveal.isDigimon === true) &&
    securityAttackerRef.current !== undefined;
  stage.stageSecurityReveal(key, settled, securityReveal.seat, {
    docking,
    countBefore: securityReveal.securityCountBefore,
    battlePending,
  });
  revealOnStageRef.current = { key, scene: settled, ...(docking ? { docked: true } : {}) };
  heldNoticesRef.current = [...heldNoticesRef.current, ...heldNotices];
  heldPanelsRef.current = [...heldPanelsRef.current, ...heldPanels];
  if (docking) {
    stage.dockSecurityReveal(
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
    // A revealed Digimon with an attacker still standing is in a battle whose verdict only
    // the close carries. That card stays up until it has one, so the blow and the deletion it
    // causes read in the order they happened. Anything else — an Option, a Tamer with no
    // clause, a check whose attacker is already gone — has nothing left to show, so it plays
    // out and leaves, and its consequences read on a clear board.
    if (battlePending) {
      stage.holdSecurityReveal(key);
      revealOnStageRef.current = { key, scene: settled };
    } else {
      stage.clearSecurityReveal(key);
      revealOnStageRef.current = { key, scene: settled, exited: true };
    }
    stage.readOutSecurityNotices(key, { notices: heldNotices, panels: heldPanels });
  }
  // An unfinished check parks at the right before its eventual close, so its free play can
  // arrive now. A closing check queues this after its branch-in instead.
  if (!closingCheck) enqueueDeferredSecurityArrivals(key);
}
