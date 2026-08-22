import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-057.js";
describe("EX6-057 Lilithmon", () => {
  it("exposes complete IR for granted deletion, prevention, and security trash", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.filter((effect) => ["OnPlay", "WhenDigivolving"].includes(effect.trigger))).toHaveLength(2);
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "endOfTurn",
    });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
    });
    expect(compiled.effects.find((effect) => effect.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
    });
  });
});
