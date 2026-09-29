import { describe, expect, it } from "vitest";
import { Phase, type GameState, type Permanent, type PlayerState } from "@aegis/shared";
import { actionGuards } from "./actionGuards";

function viewerWith(canAttackPlayer: boolean): PlayerState {
  const permanent = { canAttackPlayer, attackablePermanentIds: [] } as unknown as Permanent;
  return { battleArea: [permanent], eggDeckCount: 0 } as unknown as PlayerState;
}

function guardsAt(phase: Phase, viewer: PlayerState) {
  const state = { gameOver: false, turnSeat: 0, phase } as unknown as GameState;
  return actionGuards({
    state,
    viewer,
    viewerSeat: 0,
    decisionOpen: false,
    presenting: false,
    phasePresentationPending: false,
  });
}

describe("actionGuards", () => {
  it("blocks board actions outside Main", () => {
    expect(guardsAt(Phase.End, viewerWith(false)).mainActionBlocked).toBe(true);
  });

  it("opens the attack a pending Blitz projects outside Main", () => {
    expect(guardsAt(Phase.End, viewerWith(true)).mainActionBlocked).toBe(false);
  });
});
