import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-091.js";

describe("BT15-091", () => {
  it("waives color with Matt Ishida and may digivolve Gabumon into MetalGarurumon by placing Garurumon/WereGarurumon", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave" },
    });
    expect(compiled.effects?.[1]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      ignoreRequirements: true,
      cost: { kind: "place" },
      additionalCost: { kind: "place" },
      optional: true,
    });
  });
  it("may play a Gabumon from hand or trash and returns itself from security", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true },
        { kind: "AddToHandSelf" },
      ],
    }));
});
