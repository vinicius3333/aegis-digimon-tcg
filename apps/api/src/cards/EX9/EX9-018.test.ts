import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-018.js";

describe("EX9-018", () => {
  it("reduces its play cost by trashing a Cyborg or Ver.2 card and trashes one opposing digivolution card by placing a trash Digimon underneath", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "Replacement", cost: { kind: "trash" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1, cost: { kind: "place", destination: "digivolutionStack", faceDown: true } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[1]).toMatchObject({ kind: "Return", to: "deckBottom" });
  });
});
