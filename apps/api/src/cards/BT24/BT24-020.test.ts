import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-020.js";

describe("BT24-020 Gomamon", () => {
  it("reveals three cards for the two printed hand additions", () => {
    const reveal = compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add[0].filter.nameOrTrait).toEqual([
      { tokens: ["Sea Beast", "Shaman"], match: "trait" },
      { tokens: ["Aqua", "Sea Animal"], match: "trait" },
    ]);
    expect(reveal.add[1].filter.nameOrTrait).toEqual([{ tokens: ["TS"], match: "trait" }]);
  });

  it("draws on this Digimon's unsuspend when hand size is at most seven", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenUnsuspended",
      sourceFilter: { isSelfRef: true },
    });
    expect(inherited.actions[0].actions[0].condition).toMatchObject({ kind: "handCount", op: "lte", value: 7 });
  });
});
