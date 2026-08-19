import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-024.js";

describe("BT22-024 MarineBullmon", () => {
  it("uses the Shellmon placement into Sangomon, fixed-cost hand digivolution, and self-stack inherited play", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ isFromHand: true, condition: { kind: "youHave" } });
    expect(main?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: {
        filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Shellmon"], match: "name" }] },
        from: ["trash"],
        count: 1,
      },
      underFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Sangomon"], match: "name" }] },
      position: "bottom",
      optional: true,
    });
    expect(main?.actions[1]).toMatchObject({
      kind: "Digivolve",
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Sangomon"], match: "name" }],
          sameAsPlaceUnderTarget: true,
        },
        count: 1,
      },
      from: ["hand"],
      payCost: 3,
      ignoreRequirements: true,
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.4 w/[Aqua]/[Sea Animal] in any trait)＞" }],
      }),
    );
    const inherited = compiled.effects.find((entry) => entry.trigger === "EndOfAttack");
    expect(inherited).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
    expect(inherited?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      target: { filter: { isSelfRef: true, levelComparison: { op: "lte", value: 4 } }, count: 1 },
      optional: true,
    });
  });
});
