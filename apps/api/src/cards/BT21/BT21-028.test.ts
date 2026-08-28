import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-028.js";
import "../index.js";

describe("BT21-028 compiled implementation", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("requires the printed bottom-material cost before each lowest-DP deletion", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" }, count: 1 },
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          target: { from: ["hand"] },
        },
      });
      expect(effect?.actions[0]).not.toHaveProperty("optional");
      expect(effect?.actions[0]).not.toHaveProperty("abortOnDecline");
    }
  });

  it("publishes Security Attack +1, Raid, and both alternate level-5 evolution routes", async () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, texts: ["Gammamon"], cost: 3, isAlternate: true },
      { traits: ["Hero"], cost: 3, isAlternate: true, level: 5 },
    ]);
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-028", as: "siriusmon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("siriusmon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("siriusmon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("siriusmon"), "Raid")).toBe(true);
  });

  it("places a qualifying hand card under itself before deleting the lowest-DP opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-028", as: "siriusmon" }],
          hand: [{ card: "BT21-010", as: "gammamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-010", as: "high", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("siriusmon"));
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== lowId));

    expect(s.perm("siriusmon").stack.some((card) => card.cardId === "BT21-010")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(true);
  });

  it.each([
    { base: "BT21-077", material: "BT21-010" },
    { base: "BT21-021", material: "BT21-021" },
  ])(
    "evolves from the $base alternate route and pays a qualifying bottom-material cost",
    async ({ base, material }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base", under: [{ card: "BT1-009", as: "existing-source" }] }],
            hand: [
              { card: "BT21-028", as: "siriusmon" },
              { card: material, as: "material" },
            ],
          },
          1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 6;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("siriusmon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT21-028");
      await settle(() => s.state.players[1]!.battleArea.length === 0);

      expect(s.state.memory).toBe(3);
      expect(s.perm("base").stack[0]?.instanceId).toBe(s.inst("material").instanceId);
      expect(s.perm("base").stack[1]?.instanceId).toBe(s.inst("existing-source").instanceId);
    },
  );

  it("does not pay or delete with only a nonmatching hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-028", as: "siriusmon" }],
          hand: [{ card: "BT1-009", as: "nonmatching" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 4000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("siriusmon"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("siriusmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nonmatching").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(
      s.perm("target").permanentId,
    );
  });
});
