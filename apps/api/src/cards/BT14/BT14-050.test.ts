import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-050.js";

describe("BT14-050", () => {
  it("prevents an opposing Digimon from unsuspending through the opponent's turn end on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent" } } });
  });
});
