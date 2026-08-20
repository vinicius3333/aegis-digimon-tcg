import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-067.js";

describe("BT14-067", () => it("reveals three opponent cards, chooses a Digimon budget, deletes up to that total, and returns the reveal", () => {
  for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "RevealChooseDeleteBudget", revealCount: 3, revealController: "opponent", chooseFilter: { kind: ["Digimon"] }, upTo: true, returnRevealed: "deckTopOrBottom", returnOrder: "controllerChoice" });
}));
