import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-081.js";

describe("BT13-081 Porcupamon", () => {
  it("deletes one opposing level 3 Digimon on play and deletion", () => {
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
      });
    }
  });

  it("draws 1 then trashes 1 as an inherited once-per-turn effect", () => {
    const inherited = compiled.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "EndOfOpponentsTurn", frequency: "OncePerTurn" });
    expect(inherited?.actions?.map((action) => action.kind)).toEqual(["Draw", "Trash"]);
  });
});
