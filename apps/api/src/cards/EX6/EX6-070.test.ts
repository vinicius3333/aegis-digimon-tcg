import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-070.js";

describe("EX6-070 Phantom Pain", () => {
  it("exposes complete IR for Main, Delay, and Security clauses", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toBeDefined();
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toBeDefined();
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfOpponentsTurn")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { unsuspended: true } },
      cost: { kind: "deleteOwn" },
    });
  });
});
