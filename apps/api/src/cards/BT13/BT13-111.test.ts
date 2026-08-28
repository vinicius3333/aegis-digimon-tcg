import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-111.js";

describe("BT13-111 Gallantmon", () => {
  it("plays for the combined-trash reduction only while its controller has no Digimon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT13-111", as: "gallantmon" }],
        // Breeding is not the unspecified-area default, so this must not block the reduction.
        breeding: { card: "BT13-007", as: "breedingOnly" },
        trash: Array.from({ length: 12 }, () => "BT1-009"),
      },
      1: { trash: Array.from({ length: 8 }, () => "BT1-009") },
    });
    // 20 trash cards grant -8, making the 13-cost play affordable from 5 memory.
    s.state.memory = 5;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 0);
    expect(s.state.memory).toBe(0);
    await s.engine.recomputeContinuousEffects();
    const gallantmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT13-111");
    expect(gallantmon).toBeDefined();
    expect(observe(s.engine).hasKeyword(gallantmon!.permanentId, "Rush")).toBe(true);

    const blocked = setupEngine({
      0: {
        hand: [{ card: "BT13-111", as: "gallantmon" }],
        battleArea: [{ card: "BT1-009", as: "ownDigimon" }],
        trash: Array.from({ length: 20 }, () => "BT1-009"),
      },
    });
    blocked.state.memory = 12;
    await blocked.engine.recomputeContinuousEffects();
    expect(
      blocked.engine.applyIntent(0, { type: "playCard", instanceId: blocked.inst("gallantmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() =>
      blocked.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT13-111"),
    );
    expect(blocked.state.memory).toBe(-1);
    expect(blocked.state.players[0]!.hand.some((card) => card.cardId === "BT13-111")).toBe(false);
  });

  it("reduces play cost by two for every five cards in both trash when no Digimon is present", () => {
    const replacement = compiled.effects?.find((entry) => entry.trigger === "BeforePayCost")?.actions?.[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      scaling: { per: 5, unit: "cards", filter: { controllerDefault: "both", zone: "trash" } },
    });
    expect((replacement as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "Replacement",
      mode: "reduceCost",
      amount: 2,
      condition: {
        kind: "youHaveNone",
        filter: { controllerDefault: "mine", zone: "battleArea", kind: ["Digimon"] },
      },
    });
  });

  it("has Rush and the fallback delete when no level 6-or-lower target was deleted", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Rush" },
      duration: "permanent",
    });
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } }, count: 1 },
      });
      expect(actions[1]).toMatchObject({
        kind: "Delete",
        condition: { kind: "ifThisEffectDidNotDelete" },
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "gte", value: 13000 } }, count: 1 },
      });
    }
  });

  it("deletes a 6000 DP-or-less Digimon and skips the 13000 DP fallback", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-111", as: "gallantmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT13-111", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    const lowId = s.perm("low").topCard!.instanceId;
    const highId = s.perm("high").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === lowId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === lowId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === highId)).toBe(true);
  });

  it("uses the 13000 DP-or-more fallback only when the first deletion found no target", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-111", as: "gallantmon" }] },
        1: { battleArea: [{ card: "BT13-111", as: "high" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    const highId = s.perm("high").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gallantmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === highId));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === highId)).toBe(false);
  });

  it("fires the same ordered deletion effect when digivolving from a legal level-5 red Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-014", as: "base" }], hand: [{ card: "BT13-111", as: "gallantmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const targetId = s.perm("target").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallantmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === targetId));

    expect(s.perm("base").stack.some((card) => card.cardId === "BT13-014")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
  });

  it("fires the deletion effect when attacking the opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-111", as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    const targetId = s.perm("target").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(false);
  });
});
