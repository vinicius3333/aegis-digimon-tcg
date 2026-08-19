import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-070.js";

describe("BT22-070 DarkTyrannomon (X Antibody)", () => {
  it("deletes an opposing level 4-or-lower Digimon only with the stack condition", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
        count: 1,
      },
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { tokens: ["DarkTyrannomon"], match: "name" },
            { tokens: ["X Antibody"], match: "trait" },
          ],
        },
      },
    });
  });

  it("anchors inherited memory gain to this Digimon and excludes simultaneous deletion", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          notSimultaneous: true,
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
    });
  });
});
