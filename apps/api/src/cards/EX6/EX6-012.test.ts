import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-012.js";

describe("EX6-012 Biyomon", () => {
  it("has Blocker and inherits Jamming", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Blocker");
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Jamming");
  });
});
