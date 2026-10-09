import { GameState, PlayerState, Permanent, Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import { canAttackWith } from "../../boardModel";
import { dragIntentFor } from "../../dragIntents";
import { ownPermanentTapDestination } from "../../ownPermanentStack";
import { actionGuards } from "./actionGuards";

for (const seat of [0, 1] as const) {
  it(`GitHub #5353 seat ${seat}: accepted end-turn Blitz at -8 exposes the attack menu and security drag`, () => {
    const state = new GameState();
    state.turnSeat = seat;
    state.phase = Phase.End;
    state.memory = -8;
    const viewer = new PlayerState();
    const dragon = new Permanent();
    dragon.permanentId = "production-dna-dragon";
    dragon.controllerSeat = seat;
    dragon.isSuspended = false;
    // Same projection asserted through the real arena engine regression.
    dragon.canAttackPlayer = true;
    viewer.battleArea.push(dragon);
    const guards = (decisionOpen: boolean) =>
      actionGuards({
        state,
        viewer,
        viewerSeat: seat,
        decisionOpen,
        presenting: false,
        phasePresentationPending: false,
      });
    expect(guards(true).mainActionBlocked).toBe(true);
    expect(guards(false).mainActionBlocked).toBe(false);
    expect(canAttackWith(dragon)).toBe(true);
    expect(
      ownPermanentTapDestination({
        canAttack: canAttackWith(dragon),
        canVortex: false,
        canPromote: false,
        hasEffects: false,
        canLink: false,
      }),
    ).toBe("menu");
    expect(
      dragIntentFor({ drag: { kind: "attack" }, target: "opp-security", canAttackPlayer: dragon.canAttackPlayer }),
    ).toBe("attack");
    dragon.canAttackPlayer = false;
    expect(guards(false).mainActionBlocked).toBe(true);
    expect(
      dragIntentFor({ drag: { kind: "attack" }, target: "opp-security", canAttackPlayer: dragon.canAttackPlayer }),
    ).toBeNull();
  });
}
