import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-067.js";

describe("BT17-067 DexDoruGreymon", () => {
  it("installs the Trash replacement that digivolves a DoruGreymon before deletion", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [{ kind: "Replacement", event: "wouldBeDeleted", target: { filter: { nameOrTrait: [{ tokens: ["DoruGreymon"], match: "name" }] } }, digivolveFromTrash: true }],
    });
  });

  it("keeps the inherited end-of-attack deletion once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        { kind: "SelectBind", target: { bindAs: "chosenDigimon", upTo: true } },
        { kind: "Delete", target: { fromSelectionRef: "chosenDigimon" } },
        { kind: "Delete", target: { filter: { relativeTo: { attr: "level", op: "lte", selectionRef: "chosenDigimon" } } } },
      ],
    });
  });

  it("replaces only the draw with play-cost deletion when the condition is met", () => {
    expect(compiled.effects?.[1]?.actions?.[1]).toMatchObject({
      kind: "ConditionalBranch",
      condition: {
        kind: "anyOf",
        conditions: [
          { kind: "selfDigivolutionStackMatchesFilter" },
          { kind: "digivolvedFromZone", zone: "trash" },
        ],
      },
      ifTrue: [{ kind: "Delete", target: { filter: { playCostLte: 6 } } }],
      ifFalse: [{ kind: "Draw", amount: 1 }],
    });
  });
});
