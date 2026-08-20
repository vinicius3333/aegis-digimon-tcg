import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-094.js";

describe("BT14-094", () => {
  it("offers -6000 DP or deleting an Angemon to place an opposing Digimon as security", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "Modal", choose: 1 }] });
    const modal = compiled.effects?.[0]?.actions[0] as any;
    expect(modal).toMatchObject({ options: [[{ kind: "ModifyDP", amount: -6000 }], [{ kind: "SecurityManipulation", op: "placeAsSecurity" }]] });
    expect(modal.options?.[1]?.[0]).toMatchObject({ cost: { kind: "deleteOwn" } });
  });

  it("activates the main effect in security", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });
});
