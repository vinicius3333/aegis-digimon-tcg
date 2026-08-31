import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-164.js";

describe("P-164 Shellmon", () => {
  it("encodes On Play and When Digivolving draw with the hand placement cost", () => {
    const compiled = runtimeCompiledCard("P-164")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Draw",
            controller: "mine",
            amount: 1,
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "place",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 5 },
                  nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }],
                },
                count: 1,
                from: ["hand"],
              },
              host: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            },
          },
        ],
      });
    }
  });

  it("encodes Aquatic Rule trait and inherited once-per-turn End of Attack draw", () => {
    const compiled = runtimeCompiledCard("P-164")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Rule",
          actions: [expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] })],
        }),
        expect.objectContaining({
          trigger: "EndOfAttack",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        }),
      ]),
    );
  });

  it("draws after placing a level-5-or-lower Aqua card from hand under a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-164", as: "shellmon" }],
          hand: [{ card: "BT1-033", as: "aqua" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shellmon"));
    await settle();
    expect(s.perm("shellmon").stack.some((card) => card.instanceId === s.inst("aqua").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("fires the same placement-and-draw effect on When Digivolving and grants Aquatic", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-164", as: "shellmon" }],
          hand: [{ card: "BT1-033", as: "aqua" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("shellmon"), "Aquatic")).toBe(true);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("shellmon"));
    await settle();
    expect(s.perm("shellmon").stack.some((card) => card.instanceId === s.inst("aqua").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("draws one card from the inherited End of Attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["P-164"] }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnEndAttack, s.perm("host"));
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
