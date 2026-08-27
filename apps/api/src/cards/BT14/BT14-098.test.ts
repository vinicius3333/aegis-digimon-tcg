import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-098.js";

describe("BT14-098", () => {
  it("de-digivolves one opposing Digimon, then optionally deletes up to six by returning three D-Brigade/DigiPolice cards", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1 });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "DeleteBudget",
      filter: { controller: "opponent", kind: ["Digimon"] },
      budget: 6,
      upTo: true,
      cost: { kind: "return", target: { count: 3 } },
    });
  });
  it("activates main in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));
});
