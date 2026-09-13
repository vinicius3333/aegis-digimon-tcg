import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-016.js";

describe("EX6-016 Salamon", () => {
  it("gains memory at the start of the main phase if you have a purple Digimon or Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "youHave", filter: { colors: ["Purple"], kind: ["Digimon", "Tamer"] } },
    });
  });
  it("inherits once-per-turn -2000 DP when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
  });

  it("gains memory at main phase start only with a purple card present", async () => {
    const withPurple = setupEngine({
      0: {
        battleArea: [
          { card: "EX6-045", as: "purpleDigimon" },
          { card: "EX6-016", as: "salamon" },
        ],
        deck: Array(10).fill("BT1-009"),
      },
      1: { deck: Array(10).fill("BT1-009"), security: Array(5).fill("BT1-009") },
    });
    await withPurple.ready();
    withPurple.state.memory = 0;
    const withPurpleTurn = withPurple.engine.runOneTurn();
    await advance(withPurple.engine).waitForMainPhase(0);
    expect(withPurple.state.memory).toBe(1);
    await advance(withPurple.engine).endMainPhaseIfOpen(0);
    await withPurpleTurn;

    const withoutPurple = setupEngine({
      0: { battleArea: [{ card: "EX6-016", as: "salamon" }], deck: Array(10).fill("BT1-009") },
      1: { deck: Array(10).fill("BT1-009"), security: Array(5).fill("BT1-009") },
    });
    await withoutPurple.ready();
    withoutPurple.state.memory = 0;
    const withoutPurpleTurn = withoutPurple.engine.runOneTurn();
    await advance(withoutPurple.engine).waitForMainPhase(0);
    expect(withoutPurple.state.memory).toBe(0);
    await advance(withoutPurple.engine).endMainPhaseIfOpen(0);
    await withoutPurpleTurn;
  });

  it("reduces an opposing Digimon by 2000 DP through its inherited attack effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-016", "EX6-019"] }],
        deck: Array(10).fill("BT1-009"),
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "opponent", dp: 20_000 }],
        deck: Array(10).fill("BT1-009"),
        security: Array(6).fill("BT1-009"),
      },
    });
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 5 && s.perm("opponent").currentDP === 18_000);
    expect(s.state.players[1]!.security).toHaveLength(5);
    expect(s.perm("opponent").currentDP).toBe(18_000);
    expect(s.state.pendingDecision).toBeUndefined();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4 && s.state.pendingDecision === undefined);
    expect(s.perm("opponent").currentDP).toBe(18_000);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3 && s.state.pendingDecision === undefined);
    expect(s.perm("opponent").currentDP).toBe(18_000);
    await advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
