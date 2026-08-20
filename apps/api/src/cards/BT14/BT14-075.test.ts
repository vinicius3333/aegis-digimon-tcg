import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-075.js";

describe("BT14-075", () => {
  it("trashes three from deck on play or attack and gains +1000 DP per three trash cards", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "TrashTopDeck", amount: 3 });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 1000, scaling: { per: 3, unit: "trash" } });
  });
  it("trashes one card from the opponent's hand on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "Trash", target: { filter: { controller: "opponent", zone: "hand" } } }));
});
