import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-215.js";

describe("P-215 Icemon", () => {
  it("shares the exact paid placement and two opponent-scoped protections across all triggers", () => {
    const compiled = runtimeCompiledCard("P-215")!;
    for (const trigger of ["WhenMoving", "OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects.find((effect) => effect.trigger === trigger)!.actions[0];
      expect(action).toMatchObject({
        kind: "CostGatedBlock",
        optional: true,
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "bottom",
          host: "self",
          target: {
            filter: {
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Ice-Snow", "Mineral", "Rock"], match: "trait" }],
            },
          },
        },
        actions: [
          { kind: "SelectBind", bindAs: "protectedDigimon" },
          {
            kind: "Restrict",
            restriction: "beReturned",
            byOpponentEffectsOnly: true,
            duration: "untilOpponentTurnEnd",
          },
          {
            kind: "Restrict",
            restriction: "cantBeDeDigivolved",
            byOpponentEffectsOnly: true,
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
  });

  it("registers inherited Blocker and the exact alternate evolution path", () => {
    const compiled = runtimeCompiledCard("P-215")!;
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Ice-Snow", "Mineral", "Rock"], cost: 2, isAlternate: true },
    ]);
  });
});
describe("P-215 engine behavior", () => {
  it("pays its On Play placement cost by putting an eligible level-4 card underneath", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-215", as: "host" },
            { card: "BT1-032", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("host").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some((card) => card.instanceId === s.inst("material").instanceId));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
  });

  it("also places an eligible card when the Digimon moves from breeding", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-215", as: "host" }], hand: [{ card: "BT1-032", as: "material" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnMove, s.perm("host"));
    await settle();
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
  });
});
