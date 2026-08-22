import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-071.js";

describe("EX6-071 Pandemonium Lost", () => {
  it("contains the five-card hand cost, Digimon deletion, and Security activation IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("zoneCount");
    expect(text).toContain("Delete");
    expect(text).toContain("ActivateMain");
  });
});
