import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-077.js";

describe("BT14-077", () => {
  it("trashes the top two cards of both decks on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "TrashTopDeck", controller: "both", amount: 2 });
  });
  it("once per turn gains memory when an opponent deck card is trashed", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDiscardLibrary", sourceFilter: { controller: "opponent" }, actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
