import { describe, expect, it } from "vitest";
import { compiled as BT24_045 } from "./BT24-045.js";

describe("BT24-045 Ogremon", () => {
  it("requires the hand-trash cost and locks the suspended target until opponent turn end", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const effect = BT24_045.effects?.find((entry) => entry.trigger === trigger);
      const suspend = effect?.actions?.[0] as any;
      const restrict = effect?.actions?.[1] as any;
      expect(suspend.optional).toBeUndefined();
      expect(suspend.abortOnDecline).toBeUndefined();
      expect(restrict).toMatchObject({
        kind: "Restrict",
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        target: { sameTarget: true },
      });
    }
  });
});
