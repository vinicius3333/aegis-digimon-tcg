import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-093.js";
import "../index.js";

describe("BT21-093 [Main] on-play body fires on a real playCard (not dead)", () => {
  it("deletes the opponent's highest-DP Digimon and lands in the battle area", async () => {
    const s = setup(
      {
        0: {
          battleArea: [{ card: "BT1-009", dp: 3000 }],
          hand: [{ card: "BT21-093", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "AD1-001", dp: 3000, as: "low" },
            { card: "AD1-001", dp: 8000, as: "high" },
          ],
          security: 4,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const high = s.perm("high");
    const low = s.perm("low");
    const option = s.inst("option");
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => !p1.battleArea.includes(high));
    await settle(() => false, 60);

    expect(p1.battleArea.includes(high)).toBe(false);
    expect(p1.battleArea.includes(low)).toBe(true);
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === "BT21-093")).toBe(true);
    expect(p0.trash.some((card) => card.cardId === "BT21-093")).toBe(false);
  });
});

describe("BT21-093 Raging Serpentine", () => {
  it("models the conditional use reduction, highest-DP deletion, and Delay digivolution", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "BeforePayCost");
    expect(staticEffect?.actions[0]).toMatchObject({
      kind: "CostModifier",
      costType: "use",
      mode: "reduce",
      amount: 4,
      handResident: true,
      condition: { kind: "zoneCount", seat: "opponent", zone: "security", op: "lte", value: 3 },
    });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "highestDP" } },
    });
    expect(main?.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });

    const allTurns = compiled.effects.filter((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toHaveLength(2);
    expect(allTurns[0]?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
    });
    expect(allTurns[1]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(allTurns[1]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      from: ["hand"],
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }] },
    });

    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    [3, 4, 0],
    [4, 8, -4],
  ])("with %i opposing security pays a use cost of %i", async (securityCount, expectedCost, expectedMemory) => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT1-009", as: "color" }], hand: [{ card: "BT21-093", as: "option" }] },
        1: { security: securityCount },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-093"));
    expect(4 - s.state.memory).toBe(expectedCost);
    expect(s.state.memory).toBe(expectedMemory);
  });

  it("Security deletes only one opposing highest-DP Digimon", async () => {
    const s = setup(
      {
        0: { security: [{ card: "BT21-093", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-010", as: "high", dp: 8000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("low").instanceId,
    ]);
  });
});
