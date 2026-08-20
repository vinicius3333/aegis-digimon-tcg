import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-016.js";

describe("EX9-016", () => {
  it("has Training and inherits Jamming", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Jamming", raw: "＜Jamming＞" });
  });
});
