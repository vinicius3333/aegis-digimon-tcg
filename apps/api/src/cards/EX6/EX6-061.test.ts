import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-061.js";

describe("EX6-061 Gate of Deadly Sins", () => {
  it("exposes complete IR for both Gate of Deadly Sins reactions", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(2);
    expect(compiled.effects[0]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns" });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldLeavePlay" });
  });
});
