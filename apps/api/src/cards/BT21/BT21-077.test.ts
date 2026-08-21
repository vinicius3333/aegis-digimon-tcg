import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-077.js";
describe("BT21-077 Regulusmon", () => {
  it("costs a Gammamon card to grant Collision and recurs on deletion", () => {
    const action = compiled.effects.find((e) => e.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Collision" },
      cost: {
        kind: "trash",
        target: { filter: { zone: "hand", nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }] } },
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(compiled.effects.find((e) => e.trigger === "OnPlay")?.actions[1]).toMatchObject({
      kind: "GainTriggeredEffect",
      target: { sameTarget: true },
      gainedTrigger: "StartOfYourMainPhase",
    });
    expect(compiled.effects.filter((e) => e.trigger === "OnDeletion")).toHaveLength(2);
    expect(compiled.effects.find((e) => e.trigger === "OnDeletion" && e.isInherited)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      optional: true,
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Gammamon"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
