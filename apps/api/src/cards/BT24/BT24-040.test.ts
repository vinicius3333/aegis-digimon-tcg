import { describe, expect, it } from "vitest";
import { compiled as BT24_040 } from "./BT24-040.js";

describe("BT24-040 Venusmon", () => {
  it("trashes one opponent stack and applies the two shared restrictions", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = BT24_040.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: 99,
        target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
      });
      expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
      expect(actions[2]).toMatchObject({
        kind: "Restrict",
        restriction: "cannotActivateWhenDigivolving",
        duration: "untilOpponentTurnEnd",
        target: { sameTarget: true },
      });
    }
  });
  it("uses the other no-stack Digimon as a bottom-security replacement", () => {
    const inherited = BT24_040.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(inherited).toMatchObject({ frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).leaveCause).toBe("otherThanYourEffect");
  });
});
