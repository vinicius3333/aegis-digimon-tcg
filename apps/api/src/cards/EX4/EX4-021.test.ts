import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const EX4_021 = "EX4-021";
const BLUE_METALGREYMON = "BT10-024";
const DARKKNIGHTMON = "BT10-066";

describe("EX4-021 GreyKnightsmon", () => {
  it("registers the complete residual-free IR", () => {
    expect(runtimeCompiledCard("EX4-021")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("de-digivolves one opposing Digimon and prevents all attacks by level 4 or lower Digimon", () => {
    expect(runtimeCompiledCard("EX4-021")?.effects?.[0]?.actions).toMatchObject([
      { kind: "DeDigivolve", amount: 1, target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
      {
        kind: "Restrict",
        restriction: "attack",
        duration: "untilOpponentTurnEnd",
        target: {
          count: "all",
          filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
        },
      },
    ]);
  });

  it("replays MetalGreymon and DarkKnightmon from its digivolution cards when leaving play", () => {
    expect(runtimeCompiledCard("EX4-021")?.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false },
        { kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false },
      ],
    });
  });

  it("plays at cost 8 (12 - 2×2) with both materials placed under it", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: EX4_021, as: "dx" },
            { card: BLUE_METALGREYMON, as: "mg" },
            { card: DARKKNIGHTMON, as: "dk" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const dx = s.inst("dx");
    const mg = s.inst("mg");
    const dk = s.inst("dk");
    s.state.memory = 8;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dx.instanceId,
      digiXros: { materialInstanceIds: [mg.instanceId, dk.instanceId] },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((perm) => perm.topCard?.cardId === EX4_021) && p0.hand.length === 0);

    const perm = p0.battleArea.find((candidate) => candidate.topCard?.cardId === EX4_021);
    expect(perm).toBeDefined();
    expect(perm!.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining([BLUE_METALGREYMON, DARKKNIGHTMON]));
    expect(p0.hand.some((card) => card.instanceId === mg.instanceId)).toBe(false);
    expect(p0.hand.some((card) => card.instanceId === dk.instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("rejects a material that satisfies no recipe slot", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: EX4_021, as: "dx" },
          { card: "AD1-001", as: "wrong" },
        ],
      },
    });
    const dx = s.inst("dx");
    const wrong = s.inst("wrong");
    s.state.memory = 10;

    const res = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: dx.instanceId,
      digiXros: { materialInstanceIds: [wrong.instanceId] },
    });
    expect(res.ok).toBe(false);
  });
});
