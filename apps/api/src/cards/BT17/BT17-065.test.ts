import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-065.js";

describe("BT17-065 DexDorugamon", () => {
  it("digivolves the triggering Dorugamon from trash before preventing deletion", () => {
    const replacement = compiled.effects.find((entry) => entry.isFromTrash)?.actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBeDeleted",
      target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Dorugamon"], match: "name" }] } },
      actions: [
        { kind: "Digivolve", target: { sourceRef: "triggerSubject" }, from: ["trash"], payCost: false, ignoreRequirements: true },
        { kind: "Prevent", condition: { kind: "bindingExists", ref: "digivolvedToPreventDeletion" } },
      ],
    });
  });

  it("trashes one hand card, then branches to draw or play-cost deletion", () => {
    const actions = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } });
    expect(actions?.[1]).toMatchObject({ kind: "Draw", amount: 1, condition: { kind: "not", condition: { kind: "anyOf" } } });
    expect(actions?.[2]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", playCostLte: 4 }, count: 1 }, condition: { kind: "anyOf" } });
  });
});
