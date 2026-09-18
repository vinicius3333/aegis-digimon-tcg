import { describe, expect, it, vi } from "vitest";
import type { Dispatch, SetStateAction } from "react";
import type { GameState } from "@aegis/shared";
import { createAnimationQueue } from "../../animationQueue";
import { buildSecurityRevealScene } from "../../securityClash";
import { securityRevealScene, type SecurityRevealSceneDeps } from "./securityRevealScene";
import type { PresentationGate } from "../presentationGate";

/* A check arms a "blow" gate that every deletion it causes waits on, so a shatter never
   plays over a battle the viewer has not been shown. Only a check that HAS a battle ever
   lands that blow. A revealed Option runs its [Security] effect instead, for as long as
   the server needs — which, when the effect asks the viewer a question, is until the
   answer comes back. A gate armed there is never released and holds the very prompt the
   check is waiting on (the "Cooties Kick" freeze). */

function stageFor(overrides: { battlePending: boolean; isDigimon: boolean }) {
  const queue = createAnimationQueue();
  const securityBlowRef: SecurityRevealSceneDeps["securityBlowRef"] = {
    current: null as { key: number; landed: boolean; gate: PresentationGate } | null,
  };
  const setHeldBlowState = vi.fn<Dispatch<SetStateAction<GameState | undefined>>>();
  const noop = () => {};
  const stage = securityRevealScene({
    queue,
    enqueue: (step) => queue.enqueue(step),
    viewerSeat: 0,
    replayingHistory: false,
    batchId: "batch-1",
    revealOnStageRef: { current: null },
    queuedSecurityKeyRef: { current: null },
    securityDockRef: { current: null },
    securityHoldRef: { current: null },
    securityBlowRef,
    blowHoldState: () => undefined,
    setHeldBlowState,
    heldNoticesRef: { current: [] },
    heldPanelsRef: { current: [] },
    setSecurityBreak: noop,
    setSecurityHitSeat: noop,
    setSecurityClash: noop,
    setSecurityBranch: noop,
    setPendingRevealKey: noop,
    flushHeldNotices: noop,
    openHeld: noop,
    holdSecurityCard: noop,
    releaseSecurityCard: noop,
    releaseSecurityCardWhenIdle: noop,
    securityCountOf: () => 1,
  });
  const scene = buildSecurityRevealScene({
    key: 1,
    revealedCardId: overrides.isDigimon ? "BT13-065" : "BT11-106",
    defenderSeat: 0,
    viewerSeat: 0,
    attacker: { seat: 1, cardId: "BT24-018", permanentId: "perm-6" },
  });
  stage.stageSecurityReveal(1, scene, 0, { docking: !overrides.battlePending, battlePending: overrides.battlePending });
  return { securityBlowRef, setHeldBlowState };
}

describe("security check blow arming", () => {
  it("arms the blow for a check that will draw a battle", () => {
    const { securityBlowRef, setHeldBlowState } = stageFor({ battlePending: true, isDigimon: true });
    expect(securityBlowRef.current?.landed).toBe(false);
    expect(securityBlowRef.current?.gate.open).toBe(false);
    expect(setHeldBlowState).toHaveBeenCalledTimes(1);
  });

  it("arms nothing for a check with no battle coming", () => {
    const { securityBlowRef, setHeldBlowState } = stageFor({ battlePending: false, isDigimon: false });
    expect(securityBlowRef.current?.landed).toBe(true);
    expect(securityBlowRef.current?.gate.open).toBe(true);
    expect(setHeldBlowState).toHaveBeenCalledWith(undefined);
  });
});
