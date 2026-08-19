import { describe, expect, it } from "vitest";
import { compiled as BT24_061 } from "./BT24-061.js";

describe("BT24-061 Vademon", () => {
  it("returns a low-play-cost opponent Digimon or Tamer to deck top", () => {
    const effects = BT24_061.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Return",
        to: "deckTop",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLte: 3 }, count: 1 },
      });
    }
    const inherited = BT24_061.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
  });
});
