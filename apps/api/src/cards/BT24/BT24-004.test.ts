import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-004.js";

describe("BT24-004 Wanyamon", () => {
  it("draws once when one of your Iliad Digimon is played during your turn", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "Draw", amount: 1 });
  });
});
