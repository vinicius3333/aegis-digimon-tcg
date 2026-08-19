import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-026.js";

describe("BT24-026 Hyogamon", () => {
  it("requires the hand-trash cost before granting Jamming and Blocker", () => {
    for (const trigger of ["OnPlay", "WhenAttacking"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[0].cost).toMatchObject({ kind: "trash" });
      expect(actions[0].optional).toBeUndefined();
      expect(actions[0].abortOnDecline).toBe(true);
      expect(actions[1].target.sameTarget).toBe(true);
      expect(actions[1].keyword.keyword).toBe("Blocker");
    }
  });

  it("retains the once-per-turn trash-triggered Titamon digivolution", () => {
    const inherited = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    const action = inherited.actions[0].actions[0];
    expect(action).toMatchObject({ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true });
    expect(action.into.nameOrTrait).toEqual([
      { tokens: ["Titamon"], match: "name" },
      { tokens: ["Titan"], match: "trait" },
    ]);
  });
});
