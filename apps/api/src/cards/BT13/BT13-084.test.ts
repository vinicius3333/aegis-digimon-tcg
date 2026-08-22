import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-084.js";

describe("BT13-084 Astamon", () => {
  it("may digivolve into a Belphemon in hand by deleting another purple Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0];
      expect(action).toMatchObject({
        kind: "Digivolve",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        payCost: false,
        from: ["hand"],
        optional: true,
        into: { nameOrTrait: [{ match: "name", tokens: ["Belphemon"] }] },
        cost: {
          kind: "deleteOwn",
          target: {
            filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"], colors: ["Purple"] },
            count: 1,
          },
        },
      });
    }
  });

  it("inherits a once-per-turn trash-from-hand watcher that plays a level 4 or lower purple Digimon", () => {
    const inherited = compiled.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          actions: [
            {
              kind: "PlayWithoutCost",
              optional: true,
              payCost: false,
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Purple"],
                  levelComparison: { op: "lte", value: 4 },
                },
                count: 1,
              },
            },
          ],
        },
      ],
    });
  });
});
