import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-102.js";

describe("BT14-102", () => {
  it("offers deleting itself to place a Virus Digimon in security or give -5000 DP", () => {
    const modal = compiled.effects?.[0]?.actions[0] as any;
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenAttacking" });
    expect(modal).toMatchObject({
      kind: "Modal",
      choose: 1,
      cost: { kind: "deleteOwn" },
      options: [[{ kind: "SecurityManipulation", op: "placeAsSecurity" }], [{ kind: "ModifyDP", amount: -5000 }]],
    });
  });
  it("places itself in security on deletion and can hatch with a Tamer", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "SecurityManipulation" }, { kind: "Hatch", condition: { kind: "youHave" } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "SecurityManipulation", from: ["hand"] }],
    });
  });
});
