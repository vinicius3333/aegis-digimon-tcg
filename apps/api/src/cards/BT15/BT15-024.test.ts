import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-024.js";

describe("BT15-024", () => {
  it("draws with Matt Ishida, otherwise may play one from hand with cost reduced by 3", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "youHave" } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3, condition: { kind: "youHaveNone" }, optional: true });
  });
  it("draws once per turn when attacking", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Draw", amount: 1 }] }));
});
