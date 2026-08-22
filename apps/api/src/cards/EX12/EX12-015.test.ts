import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-015 Gokuumon", () => {
  it("reduces an opposing Digimon by 4000 on play and grants Alliance to another SW Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "ally" }],
          hand: [{ card: "EX12-015", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 6000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 2000);
    await s.ready();

    expect(s.perm("opponent").currentDP).toBe(2000);
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous;
    expect(continuous.hasKeyword(s.perm("ally").permanentId, "Alliance")).toBe(true);
  });

  it("applies the same effect on digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "ally" }, { card: "EX12-011", as: "base" }],
          hand: [{ card: "EX12-015", as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 5000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 1000);
    await s.ready();

    expect(s.perm("base").topCard?.cardId).toBe("EX12-015");
    expect(s.perm("opponent").currentDP).toBe(1000);
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } }).continuous;
    expect(continuous.hasKeyword(s.perm("ally").permanentId, "Alliance")).toBe(true);
  });

  it("deletes an opposing Digimon at 6000 DP or less from the inherited attack window", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-015", as: "host", under: ["EX12-015"] }] },
      1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 6000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("keeps a 7000 DP opposing Digimon above the inherited deletion ceiling", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-015", as: "host", under: ["EX12-015"] }] },
      1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 7000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("encodes the KB-mandated Alliance-to-attack linkage and once-per-turn inherited deletion", () => {
    const compiled = registeredCompiledCards.get("EX12-015")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[1]).toMatchObject({
        kind: "GainKeyword",
        optional: true,
        target: { count: 1, filter: { excludeSelf: true, nameOrTrait: [{ match: "trait", tokens: ["SW"] }] } },
        keyword: { keyword: "Alliance" },
        duration: "forTheTurn",
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "Attack",
        mandatory: true,
        condition: { kind: "ifThisEffectActed" },
        target: { count: 1, sameTarget: true },
        withoutSuspending: false,
      });
    }
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
        actions: [{ kind: "Delete", target: { count: 1, filter: { dp: { op: "lte", value: 6000 } }, }, optional: true }],
    });
  });
});
