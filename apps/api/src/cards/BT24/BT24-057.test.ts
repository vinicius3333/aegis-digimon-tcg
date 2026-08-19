import { describe, expect, it } from "vitest";
import { compiled as BT24_057 } from "./BT24-057.js";

describe("BT24-057 Docmon", () => {
  it("plays from security at battle end and restricts one opposing Digimon", () => {
    const security = BT24_057.effects?.find((entry) => entry.trigger === "Security");
    expect(security?.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: false });
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      const effect = BT24_057.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Restrict",
        restriction: "attackPlayers",
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });
});
