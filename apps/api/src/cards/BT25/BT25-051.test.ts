import { describe, expect, it } from "vitest";
import { compiled as BT25_051 } from "./BT25-051.js";
import "../index.js";

describe("BT25-051 Kyubimon", () => {
  it("boosts an eligible allied Digimon and draws after its own battle win", () => {
    expect(BT25_051.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Blocker", raw: "＜Blocker＞" },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(BT25_051.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "untilOpponentTurnEnd",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Beast", "Animal", "Sovereign"], match: "trait" },
              { tokens: ["Shaman", "TS"], match: "trait" },
            ],
            excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
          },
        },
      });
    }
    const inherited = BT25_051.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(inherited?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenBattleWon",
      sourceFilter: { isSelfRef: true },
    });
  });
});
