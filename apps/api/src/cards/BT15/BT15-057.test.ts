import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-057.js";

describe("BT15-057", () => {
  it("grants an On Deletion effect to play a Numemon from trash when Numemon/X Antibody is stacked", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "GrantAuraToOpponents", effectText: "[On Deletion] You may play 1 Digimon card with [Numemon] in its name from your trash without paying the cost.", condition: { kind: "selfDigivolutionStackHasTrait" } }] }));
  it("plays one Numemon from trash as an inherited deletion effect", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnDeletion", isInherited: true, actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }] }));
});
