import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-153.js";

describe("P-153 MagnaGarurumon", () => {
  it("encodes Armor Purge and a singular level 3/4/5 return", () => {
    const compiled = runtimeCompiledCard("P-153")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Armor Purge", raw: "＜Armor Purge＞" }] }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: [
            { kind: "Return", to: "hand", target: { filter: { controller: "opponent", levels: [3, 4, 5] }, count: 1 } },
          ],
        }),
      ]),
    );
  });

  it("encodes End of Attack top-security payment and the Digimon/Tamer unsuspend choice", () => {
    const end = runtimeCompiledCard("P-153")!.effects.find((effect) => effect.trigger === "EndOfAttack")!;
    expect(end.actions[0]).toMatchObject({
      kind: "Modal",
      choose: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        destination: "security",
        position: "top",
        target: { from: ["digivolutionCards"], count: 1 },
      },
      options: [
        [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } }],
        [{ kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Tamer"] } } }],
      ],
    });
    expect(runtimeCompiledCard("P-153")!.digivolutionRequirement).toEqual([
      { names: ["MagnaGarurumon"], minColors: 3, cost: 2, isAlternate: true },
    ]);
  });
});
