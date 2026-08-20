import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-008.js";

describe("EX4-008 BlackGrowlmon", () => {
  it("trashes the top two cards of both decks before an optional trash-to-hand return", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "TrashTopDeck", controller: "both", amount: 2 });
    expect(effect?.actions?.[1]).toMatchObject({ kind: "Return", to: "hand", optional: true, target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Guilmon"] }, { match: "name", tokens: ["Growlmon", "Gallantmon"] }] }, count: 1 } });
  });
  it("inherits the same optional return after deletion", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({ kind: "Return", to: "hand", optional: true });
  });
});
