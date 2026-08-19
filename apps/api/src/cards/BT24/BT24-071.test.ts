import { describe, expect, it } from "vitest";
import { compiled as BT24_071 } from "./BT24-071.js";
import "../index.js";

describe("BT24-071 Raidramon", () => {
  it("grants Security Attack +1 to one eligible trait Digimon and revives level 3 Appmon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_071.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "SecurityAttack", amount: 1 },
        duration: "forTheTurn",
        target: {
          filter: { nameOrTrait: [{ tokens: ["System", "Life", "Transmutation (App Name)"], match: "trait" }] },
          count: 1,
        },
      });
    }
    expect(BT24_071.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: { filter: { levels: [3], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } },
    });
  });
});
