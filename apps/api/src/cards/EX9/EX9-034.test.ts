import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-034.js";

describe("EX9-034", () => {
  it("has Training", () => expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" }));
  it("inherits Piercing", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Piercing", raw: "＜Piercing＞" }));
});
