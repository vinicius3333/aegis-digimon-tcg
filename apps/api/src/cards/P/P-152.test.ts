import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-152.js";

describe("P-152 Shoutmon + Dorulu Cannon", () => {
  it("encodes the attack DP reduction and Xros Heart placement cost", () => {
    const compiled = runtimeCompiledCard("P-152")!;
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    expect(attacking.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -2000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(attacking.actions[1]).toMatchObject({
      kind: "Delete",
      optional: true,
      abortOnDecline: true,
      target: {
        filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
        count: 1,
      },
      cost: {
        kind: "place",
        from: ["digivolutionCards"],
        fromHost: "self",
        underFilter: { controller: "mine", kind: ["Tamer"] },
        target: {
          filter: { zone: "digivolutionCards", nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] },
          count: 1,
        },
      },
    });
  });

  it("encodes both zero-cost named digivolution paths, Rule names, and DigiXros materials", () => {
    const compiled = runtimeCompiledCard("P-152")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Shoutmon"], playCostLte: 4, cost: 0, isAlternate: true },
      { names: ["Dorulumon"], playCostLte: 4, cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Rule",
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "name",
              tokens: ["Shoutmon", "Dorulumon"],
            },
          ],
        }),
      ]),
    );
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Shoutmon"] }], count: 1 },
      { materials: [{ names: ["Dorulumon"] }], count: 1 },
    ]);
  });
});
