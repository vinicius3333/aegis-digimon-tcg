import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-047.js";

describe("EX8-047", () => {
  it("reveals 3 for Mineral/Rock and LIBERATOR cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }], rest: "deckBottom" }));
  it("gains Mineral as a rule trait and inherits deletion of an opposing Digimon costing 4 or less when this card is discarded", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", tokens: ["Mineral"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "onDigivolutionCardDiscarded", actions: [{ kind: "Delete", target: { count: 1, filter: { playCostLte: 4 } } }] });
  });
});
