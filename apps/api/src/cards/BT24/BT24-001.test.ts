import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-001.js";

describe("BT24-001 Gigimon", () => {
  it("may delete an opponent's 3000-DP-or-less Digimon when their security is removed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "opponent" },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({
      kind: "Delete",
      optional: true,
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 3000 } } },
    });
  });
});
