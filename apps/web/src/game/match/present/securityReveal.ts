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
 * The card a security check just turned face up, put on stage.
 *
 * With the close still outstanding, the card plays its scene out and leaves, and everything
 * it causes queues behind that: the notices it earns, and the decisions its effect asks for.
 * The board is NOT given back here — the check is still running, and a reaction the removal
 * armed ("when your opponent's security stack is removed from") would open its prompt while
 * the card is still on screen. It is handed back at the close, or, for a check the server
 * stops to ask the viewer something, by the question itself; either way the card has already
 * gone.
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
  // A check that closes inside this same batch never shows the pending state: its outcome is
  // already known, so the scene is staged settled and reads the way it always has. Only a
  // check the server is still resolving holds the card unsettled.
  const settled = closingCheck ? settleSecurityClashScene(revealed, closingCheck) : revealed;
  // The server names what the card is about to do, so the client can commit to the dock at
  // the reveal rather than guessing from the close that has not arrived. An older server (or
  // a replayed history) sends no hint, and falls back to the centre-stage scene that plays
  // itself out.
  const docking = securityReveal.hasSecurityEffect === true && !closingCheck;
  stage.stageSecurityReveal(key, settled, securityReveal.seat, { docking });
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
    const battlePending = securityReveal.isDigimon === true && securityAttackerRef.current !== undefined;
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
