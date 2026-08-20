import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-013.js";

describe("EX8-013", () => {
  it("inherits Security Attack +1", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }));
});
