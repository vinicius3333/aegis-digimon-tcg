import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-015.js";

describe("EX5-015 Gabumon (X Antibody)", () => {
  it("reveals four and adds up to two Garurumon/X Antibody cards, then trashes a hand card if successful", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 2, filter: { nameOrTrait: [{ match: "name", tokens: ["Garurumon", "X Antibody"] }] } }] }, { kind: "Trash", condition: { kind: "ifThisEffectActed" } }]);
  });
  it("has the same reveal effect when digivolving and a deletion replacement", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 4 });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({ kind: "Replacement", event: "wouldBeDeleted" });
  });
});
