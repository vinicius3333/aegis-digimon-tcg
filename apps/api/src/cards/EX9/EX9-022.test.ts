import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-022.js";

describe("EX9-022", () => {
  it("has Training and inherits a permanent -3000 DP effect against all opposing Digimon during your turn", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "permanent", target: { count: "all" } });
  });
});
