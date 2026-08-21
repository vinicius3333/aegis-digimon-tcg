import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-008.js";

describe("BT20-008 Huckmon", () => {
  it("requires the printed trash cost before draw and memory, then buffs all allied Digimon", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(main?.actions[0]).toMatchObject({ kind: "Draw", cost: { kind: "trash" } });
    expect(main?.actions[0]?.optional).not.toBe(true);
    expect(main?.actions[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
    expect(main?.actions[1]?.optional).not.toBe(true);
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 1000, target: { count: "all" } });
  });
});
