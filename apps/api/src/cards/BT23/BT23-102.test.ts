import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-102.js";

describe("BT23-102 Mastemon", () => {
  it("trashes both security stacks down to three with the same-level condition", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any;
    expect(effect.actions[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      bothPlayers: true,
      leaveCount: 3,
      condition: { kind: "selfDigivolutionStackHasSameLevelPair" },
    });
  });

  it("allows either player's Digimon as the bottom-security placement source", () => {
    const trigger = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(trigger.actions[0].actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "addBottom",
      controller: "any",
    });
  });
});
