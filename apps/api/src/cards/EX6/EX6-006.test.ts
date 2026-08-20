import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-006.js";

describe("EX6-006 Gate of Deadly Sins", () => {
  it("in breeding places an egg-deck card under itself, deletes your battle-area Digimon, and places under a Seven Great Demon Lords if deletion occurred", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")).toMatchObject({ isBreeding: true, actions: [{ kind: "PlaceUnder", fromEggDeck: true }, { kind: "Delete", target: { count: "all" } }, { kind: "PlaceUnder", condition: { kind: "ifThisEffectActed" } }] });
  });
  it("offers distinct-name gated Ogudomon revival and mutually exclusive inherited cost reductions", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({ isBreeding: true, actions: [{ kind: "PlayWithoutCost", condition: { kind: "selfDigivolutionStackDistinctNameCount", value: 7 } }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", amountChoices: [{ amount: 3 }, { amount: 4, condition: { value: 5 } }] }] });
  });
});
