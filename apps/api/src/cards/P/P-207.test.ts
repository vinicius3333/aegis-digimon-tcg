import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-207.js";

describe("P-207 Minervamon", () => {
  it("requires a level 5 Beastkin or TS Digimon and has Alliance", () => {
    const card = runtimeCompiledCard("P-207")!;
    expect(card.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Beastkin", "TS"], cost: 3, isAlternate: true },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    });
  });

  it("plays eligible hand Digimon on play and digivolution, excluding Sea Animal", () => {
    const card = runtimeCompiledCard("P-207")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: {
              count: 1,
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
                nameOrTrait: [
                  { tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "trait" },
                  { tokens: ["TS"], match: "trait" },
                ],
              },
            },
          },
        ],
      });
    }
  });

  it("once per turn plays the same eligible card set from trash when attacking", () => {
    expect(runtimeCompiledCard("P-207")!.effects.find((effect) => effect.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: {
            count: 1,
            filter: {
              levelComparison: { op: "lte", value: 4 },
              excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("exposes Alliance on the live Minervamon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-207", as: "minerva" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("minerva"), "Alliance")).toBe(true);
  });

  it("plays an eligible level-4 Avian from hand on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-207", as: "minerva" }], hand: [{ card: "BT1-013", as: "avian" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("minerva"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("avian").instanceId)).toBe(true);
  });

  it("plays the same eligible card from hand when digivolving", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-207", as: "minerva" }], hand: [{ card: "BT1-013", as: "avian" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("minerva"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("avian").instanceId)).toBe(true);
  });

  it("plays an eligible level-4 card from trash after a real attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-207", as: "minerva" }], trash: [{ card: "BT1-013", as: "avian" }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("minerva").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("avian").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("avian").instanceId)).toBe(true);
  });
});
