import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-029 Witchmon", () => {
  it("preserves the top-security memory cost and inherited yellow Data/Witchelny replacement", () => {
    const card = runtimeCompiledCard("BT19-029");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            optional: false,
            cost: {
              kind: "trash",
              target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            },
          },
        ],
      },
      {
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            leaveCause: "opponentEffect",
            sourceFilter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Yellow"],
              nameOrTrait: [
                { tokens: ["Data"], match: "trait" },
                { tokens: ["Witchelny"], match: "trait", orPrevious: true },
              ],
            },
            cost: {
              kind: "trash",
              target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            },
          },
        ],
      },
    ]);
  });
});
