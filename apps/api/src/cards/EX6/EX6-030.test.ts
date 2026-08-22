import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-030.js";

describe("EX6-030 Mastemon", () => {
  it("contains the security search/play and Angel protection clauses in typed IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("SearchSecurity");
    expect(text).toContain("PlayWithoutCost");
    expect(text).toContain("trashSecurityTop");
  });
});
