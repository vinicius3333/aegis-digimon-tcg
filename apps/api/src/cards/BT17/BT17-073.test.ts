import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-073.js";

describe("BT17-073 DexDorugoramon", () => {
  it("replaces deletion of your Dorugoramon with optional self digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.isFromTrash);
    expect(effect?.trigger).toBe("AllTurns");
    expect(effect?.actions).toEqual([
      expect.objectContaining({
        kind: "Replacement",
        event: "wouldBeDeleted",
        sourceFilter: expect.objectContaining({
          controller: "mine",
          nameOrTrait: [{ tokens: ["Dorugoramon"], match: "name" }],
        }),
        actions: [
          expect.objectContaining({
            kind: "Prevent",
            cost: expect.objectContaining({ kind: "digivolveSelf" }),
            optional: true,
          }),
        ],
      }),
    ]);
  });

  it("de-digivolves three levels and conditionally deletes lowest-level Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 3,
      stopAtLevel: 3,
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "Delete",
      condition: { kind: "anyOf" },
      target: { filter: { controller: "opponent", superlative: "lowestLevel" } },
    });
  });

  it("unsuspends itself once per turn when another Digimon is deleted", () => {
    const effect = compiled.effects.find((entry) => entry.frequency === "OncePerTurn");
    expect(effect).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      actions: [{ kind: "Unsuspend", target: { isSelf: true } }],
    });
  });
});
