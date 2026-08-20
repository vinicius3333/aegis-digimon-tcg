import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-084.js";

describe("BT13-084 Astamon", () => {
  it("may digivolve into a Belphemon in hand by deleting another purple Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0];
      expect(action).toMatchObject({
        kind: "Digivolve", payCost: false, from: ["hand"], optional: true,
        into: { nameOrTrait: [{ match: "name", tokens: ["Belphemon"] }] },
        cost: { kind: "deleteOwn", target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"], colors: ["Purple"] }, count: 1 } },
      });
    }
  });

  it("inherits a once-per-turn trash-from-hand watcher that plays a level 4 or lower purple Digimon", () => {
    const inherited = compiled.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenTrashedFromHand" }] });
    expect((inherited?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({ kind: "PlayWithoutCost", optional: true, target: { filter: { zone: "trash", colors: ["Purple"], levelComparison: { op: "lte", value: 4 } } } });
  });
});
