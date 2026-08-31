import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-160.js";

describe("P-160 Tyrannomon (X Antibody)", () => {
  it("requires non-X-Antibody Tyrannomon for zero-cost digivolution", () => {
    expect(runtimeCompiledCard("P-160")!.digivolutionRequirement).toEqual([
      { level: 4, names: ["Tyrannomon"], excludeTraits: ["X Antibody"], cost: 0, isAlternate: true },
    ]);
  });

  it("checks Tyrannomon name or X Antibody trait in the stack for its attack digivolution", () => {
    const attack = runtimeCompiledCard("P-160")!.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    expect(attack).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          optional: true,
          reduceCost: 1,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: expect.arrayContaining([
                { tokens: ["Tyrannomon"], match: "name" },
                { tokens: ["X Antibody"], match: "trait" },
              ]),
            },
          },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Tyrannomon"], match: "name" },
              { tokens: ["Dinosaur"], match: "trait" },
            ],
          },
        },
      ],
    });
  });

  it("exposes Raid on the played Tyrannomon X Antibody", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-160", as: "host" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
  });

  it("digivolves into a higher-level Dinosaur from hand when the X Antibody stack condition is met", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-160", as: "host", under: ["BT11-064"] }],
          hand: [{ card: "BT8-016", as: "target" }],
        },
        1: { security: 1 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.perm("host").topCard.cardId === "BT8-016");
    expect(s.perm("host").topCard.cardId).toBe("BT8-016");
  });
});
