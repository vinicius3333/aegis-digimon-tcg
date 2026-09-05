import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import "../../cards/index.js";

describe("AD1-008 Gallantmon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-008");
    const compiled = registeredCompiledCards.get("AD1-008") ?? getCompiledCard("AD1-008");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-008");
    expect(definition?.nameEn).toBe("Gallantmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("deletes multiple Digimon totaling 10000 DP, then deletes the remaining lowest-DP Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-014", as: "base" }], hand: [{ card: "AD1-008", as: "gallantmon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "budget-a", dp: 5000 },
            { card: "BT1-010", as: "budget-b", dp: 5000 },
            { card: "BT1-010", as: "lowest-after-budget", dp: 11000, suspended: true },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const budgetAId = s.perm("budget-a").permanentId;
    const budgetBId = s.perm("budget-b").permanentId;
    const lowestAfterBudgetId = s.perm("lowest-after-budget").permanentId;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 5000);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === budgetAId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === budgetBId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestAfterBudgetId)).toBe(
      false,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses either printed alternate level-5 route for cost 3", async () => {
    for (const baseCard of ["BT9-014", "AD1-011"]) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCard, as: "base" }], hand: [{ card: "AD1-008", as: "gallantmon" }] },
      });
      s.state.memory = 5;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gallantmon").instanceId,
          alternateRequirementIndex: baseCard === "BT9-014" ? 0 : 1,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "AD1-008");
      expect(s.state.memory).toBe(2);
    }
  });

  it("gets +5000 DP on its turn only while Takato Matsuki is in its digivolution cards", async () => {
    const qualified = setupEngine({
      0: { battleArea: [{ card: "AD1-008", as: "qualified", under: ["BT12-089"] }] },
    });
    await qualified.ready();
    expect(qualified.perm("qualified").currentDP).toBe(17000);

    const unqualified = setupEngine({
      0: { battleArea: [{ card: "AD1-008", as: "unqualified", under: ["BT1-001"] }] },
    });
    await unqualified.ready();
    expect(unqualified.perm("unqualified").currentDP).toBe(12000);
  });

  it("is unaffected by opponent effects only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-008", as: "protected", under: ["BT12-089"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasRestriction(s.perm("protected"), "beAffected")).toBe(true);
    expect(s.perm("protected").currentDP).toBe(17000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).hasRestriction(s.perm("protected"), "beAffected")).toBe(false);
    expect(s.perm("protected").currentDP).toBe(12000);
  });

  it("uses Rush, Raid, and Piercing together after being played", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-008", as: "gallantmon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "raid-target", dp: 6000 }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.state.players[0]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
