import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-059.js";

describe("EX6-059 Barbamon", () => {
  it("contains hand-trash revival, Scapegoat, and scaled play-cost IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("whenHandTrashed");
    expect(text).toContain("Scapegoat");
    expect(text).toContain("playCostLteScaling");
  });
});
