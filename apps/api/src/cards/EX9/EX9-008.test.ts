import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-008.js";

describe("EX9-008", () => {
  it("has Training and inherits Raid", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Raid", raw: "＜Raid＞" });
  });
});
