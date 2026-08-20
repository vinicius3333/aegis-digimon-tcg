import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-031.js";

describe("EX4-031 Cherubimon", () => {
  it("has Alliance and scales -3000 by own suspended Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([{ keyword: "Alliance" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, scaling: { per: 1, unit: "cards", filter: { controller: "mine", suspended: true } } });
  });
  it("has the same DP reduction when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" });
  });
});
