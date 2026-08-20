import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-055.js";

describe("EX9-055", () => {
  it("plays Abbadomon Core from hand or trash in the breeding area when four Negamon-text cards are available", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], breeding: true, requiresEmpty: "breedingArea", condition: { kind: "youHave", count: 4 } }] }));
  it("at end of all turns places a level 6-or-lower Negamon-text Digimon from trash and deletes a matching opposing level", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { filter: { levelComparison: { op: "eq", value: 0, scaling: { unit: "namedCount" } } }, }, cost: { kind: "place", position: "top", target: { filter: { levelComparison: { op: "lte", value: 6 } } } } }] }));
});
