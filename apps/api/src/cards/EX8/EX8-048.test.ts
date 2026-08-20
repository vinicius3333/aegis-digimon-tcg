import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-048.js";

describe("EX8-048", () => {
  it("plays Close from hand when digivolving with one or fewer Tamers", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "youHave" } }));
  it("inherits deletion of an opposing Digimon costing 4 or less when this card is discarded", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "onDigivolutionCardDiscarded", actions: [{ kind: "Delete", target: { count: 1, filter: { playCostLte: 4 } } }] }));
});
