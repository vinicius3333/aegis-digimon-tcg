import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-191.js";

describe("P-191 Apollomon", () => {
  it("encodes Light Fang/Night Claw evolution and Blast Digivolve", () => {
    const card = runtimeCompiledCard("P-191")!;
    expect(card.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Light Fang", "Night Claw"], cost: 4, isAlternate: true },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("uses a 7000 DP deletion budget plus one per Olympos XII Digimon at both timings", () => {
    const card = runtimeCompiledCard("P-191")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            amount: -4000,
            scaling: { per: 1, unit: "cards", filter: { nameOrTrait: [{ tokens: ["Olympos XII"], match: "trait" }] } },
          },
          {
            kind: "DeleteByDPBudget",
            baseBudget: 7000,
            target: { count: "all" },
            budgetBonus: {
              per: 1,
              unit: "cards",
              filter: { nameOrTrait: [{ tokens: ["Olympos XII"], match: "trait" }] },
            },
          },
        ],
      });
    }
  });

  it("keeps the DNA-then-attack sequence and inherited once-per-turn attack", () => {
    const card = runtimeCompiledCard("P-191")!;
    expect(card.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "DnaDigivolve",
          optional: true,
          payCost: true,
          into: { nameOrTrait: [{ tokens: ["GraceNovamon"], match: "name" }] },
        },
        { kind: "Attack", optional: true },
      ],
    });
    expect(card.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "Attack", optional: true }],
    });
  });

  it("reduces an opposing Digimon by 4000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-191", as: "source" }], battleArea: [{ card: "BT1-009", as: "color" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 12000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").currentDP === 8000);
    expect(s.perm("victim").currentDP).toBe(8000);
  });

  it("applies the same budget effect when digivolving and resolves both end-turn attack windows", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-191", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();
    expect(s.perm("victim").currentDP).toBe(8000);
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("source"));
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("source"));
    expect(s.perm("victim").currentDP).toBe(8000);
  });
});
