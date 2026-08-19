import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-003.js";

describe("BT24-003 Tsunomon", () => {
  it("digivolves this Digimon into a Shaman from hand when your security is removed", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
    });
    expect(inherited.actions[0].actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      reduceCost: 1,
      optional: true,
      target: { filter: { isSelfRef: true } },
    });
  });
});
