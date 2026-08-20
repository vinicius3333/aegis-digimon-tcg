import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-080.js";

describe("BT14-080", () => {
  it("once per turn trashes the opponent's deck based on own trash count on digivolution or attack", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger && entry.actions[0]?.kind === "TrashTopDeck")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "TrashTopDeck", controller: "opponent", amount: 3, scaling: { per: 10, unit: "trash" } }] });
  });
  it("once per turn gains Security Attack +1 when the opponent has ten cards in trash", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && entry.actions[0]?.kind === "GainKeyword")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, condition: { kind: "zoneCount", value: 10 } }] }));
});
