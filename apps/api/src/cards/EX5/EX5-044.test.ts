import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-044.js";

describe("EX5-044 Elecmon", () => {
  it("reveals five and adds a Leomon card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 5, rest: "deckBottom", add: [{ count: 1, to: "hand", filter: { nameOrTrait: [{ match: "name", tokens: ["Leomon"] }] } }] });
  });
  it("inherits De-Digivolve 1 on one opposing Digimon when deleted", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent" } } });
  });
});
