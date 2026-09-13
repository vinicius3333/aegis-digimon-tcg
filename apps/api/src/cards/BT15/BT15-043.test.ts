import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-043.js";

describe("BT15-043", () => {
  it("may suspend one Digimon to give an Insectoid +3000 DP", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd", cost: { kind: "suspend" }, optional: true },
      ],
    }));
  it("gains 1 memory once per turn when this Digimon deletes in battle", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    }));

  it("suspends a Digimon as the natural start-of-main cost and buffs one Insectoid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-044", as: "cost" },
            { card: "BT15-043", as: "source", dp: 1000 },
            { card: "BT15-047", as: "otherInsectoid", dp: 5000 },
          ],
        },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    await advance(s.engine).runTurn(0);
    await settle(() => s.perm("source").currentDP === 4000);

    expect(s.perm("cost").isSuspended).toBe(true);
    expect(s.perm("source").currentDP).toBe(4000);
    expect(s.perm("otherInsectoid").currentDP).toBe(5000);
  });

  it("preserves the inherited battle trigger through a legal evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-073", as: "host", under: ["BT15-043"] }],
        deck: ["BT1-009", "BT1-010", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target", dp: 1000, suspended: true },
          { card: "BT1-009", as: "secondTarget", dp: 1000, suspended: true },
          { card: "BT1-009", as: "thirdTarget", dp: 1000, suspended: true },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.memory = 0;
    const firstTargetId = s.perm("target").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    const thirdTargetId = s.perm("thirdTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: firstTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstTargetId));

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT15-043"]);
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: secondTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondTargetId));
    expect(s.state.memory).toBe(1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.suspend([thirdTargetId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: thirdTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === thirdTargetId));
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("digivolves legally from a green level-2 Digi-Egg in the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-007", as: "egg" },
        hand: [{ card: "BT15-043", as: "tentomon" }],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("tentomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard?.cardId === "BT15-043");

    expect(s.perm("egg").topCard?.cardId).toBe("BT15-043");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT1-007"]);
  });
});
