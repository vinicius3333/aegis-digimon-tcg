import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-064.js";

describe("EX9-064", () => {
  it("reduces play cost by two by trashing Cyborg or Ver.4 and deletes two low-cost Digimon after placing a trash source", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({ actions: [{ actions: [{ mode: "reduceCost", amount: 2, cost: { kind: "trash" } }] }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "Delete", target: { count: 2, filter: { playCostLte: 4 } }, cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }, { kind: "CostModifier", amount: 1, scaling: { unit: "selfFaceDownDigivolutionCards" } }] });
  });
  it("inherits once-per-turn deletion of the lowest-level own Digimon by unsuspending itself", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { filter: { superlative: "lowestLevel" } }, cost: { kind: "unsuspend" } }] }));
});
