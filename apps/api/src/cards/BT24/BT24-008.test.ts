import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-008.js";

describe("BT24-008 Elizamon", () => {
  it("requires trashing a qualifying hand card before drawing two", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0] as any;
    expect(action).toMatchObject({ kind: "Draw", amount: 2, cost: { kind: "trash" } });
    expect(action.cost.target.filter.nameOrTrait).toEqual([
      { tokens: ["Reptile"], match: "trait" },
      { tokens: ["Dragonkin"], match: "trait" },
      { tokens: ["LIBERATOR"], match: "trait" },
    ]);
  });

  it("gains memory only when the opponent's security stack is removed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "GainMemory", amount: 1 });
  });
});
