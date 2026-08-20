import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-014.js";

describe("EX4-014 Gaossmon", () => {
  it("draws when either player's Blue Flare card is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { nameOrTrait: [{ match: "trait", tokens: ["Blue Flare"] }] }, actions: [{ kind: "Draw", controller: "mine", amount: 1 }] });
  });
  it("returns a DigiXros-requirement Digimon when either player's Twilight card is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[1]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { nameOrTrait: [{ match: "trait", tokens: ["Twilight"] }] }, actions: [{ kind: "Return", to: "hand", target: { filter: { zone: "trash", controller: "mine", kind: ["Digimon"], hasDigiXrosRequirements: true } } }] });
  });
});
