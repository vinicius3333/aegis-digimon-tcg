import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-022.js";

describe("BT24-022 Ikkakumon", () => {
  it("trashes two stack cards, then restricts an opponent Digimon by source stack count", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)?.actions as any[];
      expect(actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 2, fromTop: true });
      expect(actions[1]).toMatchObject({ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" });
      expect(actions[1].target.filter.digivolutionCardsCompareToSource).toBe("lte");
    }
  });

  it("keeps the inherited unsuspend-to-draw condition", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    const sub = inherited.actions[0];
    expect(sub).toMatchObject({ kind: "SubTrigger", event: "whenUnsuspended" });
    expect(sub.actions[0].condition).toMatchObject({ kind: "handCount", op: "lte", value: 7 });
  });
});
