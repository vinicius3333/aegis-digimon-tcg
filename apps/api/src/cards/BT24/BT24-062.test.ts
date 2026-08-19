import { describe, expect, it } from "vitest";
import { compiled as BT24_062 } from "./BT24-062.js";

describe("BT24-062 MasterBlimpmon", () => {
  it("plays the qualifying card from this Digimon's stack at either shared timing", () => {
    const effects = BT24_062.effects?.filter((entry) => ["EndOfAttack", "EndOfOpponentsTurn"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.frequency).toBe("OncePerTurn");
      expect(effect.sharedUseKey).toBe("ir-shared-0");
      expect(effect.actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["digivolutionCards"] });
      expect((effect.actions?.[0] as any).target.source).toBe("thisDigimon");
    }
  });
});
