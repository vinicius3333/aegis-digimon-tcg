import { describe, expect, it } from "vitest";
import { compiled as BT25_063 } from "./BT25-063.js";
import "../index.js";

describe("BT25-063 Missimon", () => {
  it("reveals three for Chaosmon, D-Brigade, or ACCEL", () => {
    for (const trigger of ["WhenMoving", "OnPlay"] as const) {
      const effect = BT25_063.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" });
      expect((effect?.actions?.[0] as { add?: unknown }).add).toEqual([
        expect.objectContaining({
          count: 1,
          to: "hand",
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [
              { tokens: ["Chaosmon"], match: "name" },
              { tokens: ["D-Brigade", "ACCEL"], match: "trait" },
            ],
          },
        }),
      ]);
    }
    expect(BT25_063.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
      target: { filter: { isSelfRef: true }, isSelf: true },
    });
  });
});
