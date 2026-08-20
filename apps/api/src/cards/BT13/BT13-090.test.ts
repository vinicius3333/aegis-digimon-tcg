import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-090.js";

describe("BT13-090 LordKnightmon", () => {
  it("may return one Lucemon-named or Royal Knight card from trash on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "Return", to: "hand", optional: true,
        target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [
          { match: "name", tokens: ["Lucemon"] },
          { match: "trait", tokens: ["Royal Knight"] },
        ] }, count: 1 },
      });
    }
  });

  it("gains 1 memory per Royal Knight Digimon when an opponent's Digimon attacks", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0];
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "GainMemory", amount: 1 }], scaling: { per: 1, unit: "cards", filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }] } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({ frequency: "OncePerTurn" });
  });
});
