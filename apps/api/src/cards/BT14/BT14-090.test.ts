import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-090.js";

describe("BT14-090", () => {
  it("waives the color requirement with Tai and digivolves Agumon into WarGreymon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Digivolve", payCost: false, ignoreRequirements: true }],
    });
  });

  it("plays an Agumon from hand or trash and adds itself in security", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }],
    });
  });
});
