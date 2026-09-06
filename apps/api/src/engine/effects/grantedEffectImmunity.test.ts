import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

describe("granted start-of-main attack and effect immunity", () => {
  it("gives an unaffected BT19-101 the grant publicly but does not trigger it", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "tai" }],
          hand: [{ card: "BT21-057", as: "greymon" }],
          security: ["BT1-001"],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [{ card: "BT19-101", as: "unaffected" }],
          security: ["BT1-001"],
          deck: ["BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("unaffected").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("unaffected")).length === 1);
    expect(observe(s.engine).customEffectGrants(s.perm("unaffected"))).toHaveLength(1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("unaffected").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("keeps the same public grant path attacking with an affected Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "tai" }],
          hand: [{ card: "BT21-057", as: "greymon" }],
          security: ["BT1-001"],
          deck: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "attacker" }],
          security: ["BT1-001"],
          deck: ["BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("attacker").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("attacker")).length === 1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 0;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
