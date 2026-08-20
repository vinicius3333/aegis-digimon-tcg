import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-089.js";

describe("BT15-089", () => {
  it("deletes an opposing Digimon with 15000 DP or less and loses 2000 DP per opposing security card", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", value: 15000 } } } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", scaling: { per: 1, unit: "security" } });
  });
  it("activates its main effect in security", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }));
});
