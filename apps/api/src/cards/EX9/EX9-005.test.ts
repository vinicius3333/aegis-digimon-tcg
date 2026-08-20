import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-005.js";

describe("EX9-005", () => {
  it("once per breeding turn may play a Negamon-text Digimon from hand with cost reductions and place it underneath itself", () => {
    const actions = compiled.effects?.find((entry) => entry.isBreeding && entry.trigger === "Main")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: true, optional: true });
    expect(actions[1]).toMatchObject({ kind: "Replacement", mode: "reduceCost", amount: 2 });
    expect(actions[3]).toMatchObject({ kind: "PlaceUnder" });
  });
  it("restricts itself from digivolving, being deleted, and being trashed, and redirects opponent attacks", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toHaveLength(3);
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOpponentAttacks" });
  });
});
