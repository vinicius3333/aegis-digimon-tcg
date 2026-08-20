import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-047.js";

describe("BT14-047", () => {
  it("suspends an opposing Digimon and prevents opposing Digimon at 5000 DP or less from unsuspending on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", target: { count: "all", filter: { dp: { op: "lte", value: 5000 } } } }] });
  });
});
