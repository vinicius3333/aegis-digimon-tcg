import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX7-061.js";

describe("EX7-061 Lilithmon (X Antibody)", () => {
  it("registers its own complete IR record", () => {
    expect(hasRegisteredCompiledCard("EX7-061")).toBe(true);
    expect(compiled.residual).toEqual([]);
  });

  it("requires Lilithmon or X Antibody in its own evolution stack before the optional prevention", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          actions: [
            {
              kind: "Prevent",
              condition: {
                kind: "selfHasInDigivolutionCards",
                nameOrTrait: [
                  { tokens: ["Lilithmon"], match: "name" },
                  { tokens: ["X Antibody"], match: "trait" },
                ],
              },
              cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true }, count: 1 } },
            },
          ],
        },
      ],
    }));

  it("keeps the turn-dependent once-per-turn deletion response", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [{ kind: "PlayWithoutCost", condition: { kind: "isYourTurn" } }],
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          condition: { kind: "isOpponentsTurn" },
        },
      ],
    }));
});
