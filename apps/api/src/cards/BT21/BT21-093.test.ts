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

    const watcher = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(watcher?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "opponent" },
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
    });
    expect(watcher?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    const watcherAction = watcher?.actions[0];
    if (watcherAction?.kind !== "SubTrigger") throw new Error("expected reactive Delay watcher");
    expect(watcherAction.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
        },
      },
      payCost: false,
      from: ["hand"],
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }] },
    });

    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("arms and publicly activates Delay for a Reptile or Dragonkin host only", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "color" },
            { card: "BT21-014", as: "ineligible" },
            { card: "BT21-017", as: "eligible" },
          ],
          hand: [
            { card: "BT21-093", as: "option" },
            { card: "BT21-025", as: "destination" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { security: [{ card: "BT1-009", as: "security" }], deck: ["BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === optionId));
    const optionPermanent = s.perm("option");
    optionPermanent.enterFieldTurnCount = -1;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("eligible").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("eligible").topCard.instanceId === s.inst("destination").instanceId);
    await settle(() => s.perm("eligible").topCard.instanceId === s.inst("destination").instanceId);

    expect(s.perm("eligible").topCard.instanceId).toBe(s.inst("destination").instanceId);
    expect(s.perm("ineligible").topCard.cardId).toBe("BT21-014");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
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
