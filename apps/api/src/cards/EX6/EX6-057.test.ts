import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-057.js";

describe("EX6-057 Lilithmon", () => {
  it("contains the granted end-of-turn deletion and once-per-turn protection IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("GainTriggeredEffect");
    expect(text).toContain("wouldLeavePlay");
    expect(text).toContain("OncePerTurn");
  });
});
