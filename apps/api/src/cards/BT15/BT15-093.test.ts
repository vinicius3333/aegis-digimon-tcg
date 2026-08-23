import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-093.js";

describe("BT15-093", () => {
  it("gives one opposing Digimon -6000 DP and may trash security for a second -6000 DP effect", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      duration: "forTheTurn",
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -6000,
      cost: { kind: "trash" },
      optional: true,
    });
  });
  it("activates main in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));
});
