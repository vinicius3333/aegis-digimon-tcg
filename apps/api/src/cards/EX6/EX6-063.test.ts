import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-063.js";

describe("EX6-063 Mirei Mikagura", () => {
  it("exposes complete IR for Barrier, Angel, and Security clauses", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(4);
    expect(compiled.effects.filter((effect) => effect.trigger === "OnPlay")).toHaveLength(1);
    expect(compiled.effects.filter((effect) => effect.trigger === "StartOfYourMainPhase")).toHaveLength(1);
    expect(compiled.effects.filter((effect) => effect.trigger === "YourTurn")).toHaveLength(1);
    expect(compiled.effects.filter((effect) => effect.trigger === "Security")).toHaveLength(1);
  });
});
