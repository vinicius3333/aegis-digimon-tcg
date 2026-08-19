import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-019.js";

describe("BT24-019 Kamemon", () => {
  it("reduces this Digimon's blue TS digivolution cost during your turn", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions?.[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true },
    });
    expect(replacement.into).toMatchObject({ colors: ["Blue"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] });
    expect(replacement.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      mode: "reduceCost",
      amount: 1,
    });
  });

  it("retains inherited Jamming", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });
});
