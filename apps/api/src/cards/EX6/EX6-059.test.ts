import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-059.js";

describe("EX6-059 Barbamon", () => {
  it("exposes complete IR for hand trash, Scapegoat, and purple revival", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenHandTrashed",
      handTrashedController: "opponent",
    });
    expect(allTurns?.actions[0]?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
    });
  });
});
