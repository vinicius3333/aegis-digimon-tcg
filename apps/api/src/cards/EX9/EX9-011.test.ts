import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-011.js";

describe("EX9-011", () => {
  it("reduces its play cost by trashing a Cyborg or Ver.1 card and places a trash Digimon underneath when deleting opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({ kind: "Replacement", actions: [{ mode: "reduceCost", amount: 2, cost: { kind: "trash" } }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Delete", optional: true, cost: { kind: "place", destination: "digivolutionStack", faceDown: true } });
  });
});
