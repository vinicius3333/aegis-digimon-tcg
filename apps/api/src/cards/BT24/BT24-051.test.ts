import { describe, expect, it } from "vitest";
import { compiled as BT24_051 } from "./BT24-051.js";

describe("BT24-051 Merukimon", () => {
  it("shares the once-per-turn unsuspend between When Digivolving and When Attacking", () => {
    const effects = BT24_051.effects?.filter(
      (entry) =>
        ["WhenDigivolving", "WhenAttacking"].includes(entry.trigger) && entry.actions?.[0]?.kind === "Unsuspend",
    );
    expect(effects).toHaveLength(2);
    expect(effects?.map((entry) => entry.sharedUseKey)).toEqual(["ir-shared-0", "ir-shared-0"]);
    expect(effects?.every((entry) => entry.frequency === "OncePerTurn")).toBe(true);
  });
  it("makes the buffed Digimon attack an opponent's Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = BT24_051.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[2]).toMatchObject({
        kind: "Attack",
        optional: false,
        condition: { kind: "ifThisEffectActed" },
      });
    }
  });
});
