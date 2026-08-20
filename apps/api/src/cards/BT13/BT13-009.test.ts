import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-009.js";

describe("BT13-009 Huckmon", () => {
  it("keeps the two Sistermon-triggered clauses independent and complete", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(2);

    const [main, inherited] = compiled.effects;
    expect(main).toMatchObject({
      trigger: "YourTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Sistermon"] }] },
        actions: [{ kind: "Digivolve", payCost: false, from: ["hand"], optional: true, into: { nameOrTrait: [{ match: "name", tokens: ["BaoHuckmon"] }] } }],
      }],
    });
    expect(inherited).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { nameOrTrait: [{ match: "name", tokens: ["Sistermon"] }] },
        actions: [{ kind: "GainMemory", amount: 1 }],
      }],
    });
  });
});
