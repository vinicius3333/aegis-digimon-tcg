import { describe, expect, it } from "vitest";
import { compiled as BT24_069 } from "./BT24-069.js";
import "../index.js";

describe("BT24-069 Vilemon", () => {
  it("lets the opponent choose their discard and mills only when they decline", () => {
    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      const actions = BT24_069.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[1]).toMatchObject({
        kind: "Trash",
        controller: "opponent",
        chooser: "opponent",
        optional: true,
      });
      expect(actions[2]).toMatchObject({
        kind: "TrashTopDeck",
        controller: "opponent",
        amount: 2,
        condition: { kind: "ifThisEffectDidNotAct" },
      });
    }
  });
});
