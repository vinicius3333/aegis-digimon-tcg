import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-026.js";

describe("EX5-026 MetalGarurumon (X Antibody)", () => {
  it("has Blocker and gives opposing Digimon the conditional lose-four-memory attack effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([{ keyword: "Blocker" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "GrantAuraToOpponents", target: { count: "all" }, effectText: "[When Attacking] Lose 4 memory", duration: "untilOpponentTurnEnd" });
  });
  it("returns a trash Digimon to deck bottom and deletes an opposing Digimon of the returned level", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({ kind: "Delete", target: { filter: { controller: "opponent", levelEq: "returnedDigimonLevel" } }, cost: { kind: "return", to: "deckBottom", storeAs: "returnedDigimonLevel" } });
  });
});
