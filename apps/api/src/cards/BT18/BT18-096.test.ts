import { describe, expect, it } from "vitest";
import { compiled } from "./BT18-096.js";

describe("BT18-096 Lord of Devastation and Rebirth", () => {
  it("covers color waiver, Susanoomon digivolution, distinct-color placement, and security", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "Digivolve", payCost: false },
        { kind: "GainMemory", amount: 1, scaling: { usePaidCount: true } },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }],
    });
  });
});
