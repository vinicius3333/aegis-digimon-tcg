import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-007.js";

describe("BT13-007 King Drasil_7D6", () => {
  it("models all four printed clauses with breeding-scoped timing", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    const yourTurn = compiled.effects.filter((effect) => effect.trigger === "YourTurn");
    expect(yourTurn).toHaveLength(3);
    expect(yourTurn[0]).toMatchObject({ isBreeding: true, actions: [{ kind: "Restrict", restriction: "digivolve" }] });
    expect(yourTurn[1]).toMatchObject({
      isBreeding: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }] } }],
    });
    expect(yourTurn[2]).toMatchObject({
      isBreeding: true,
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOptionPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }],
    });

    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")).toMatchObject({
      isBreeding: true,
      actions: [
        { kind: "PlaceUnder", fromEggDeck: true },
        { kind: "PlaceUnder", targetIsPermanent: true, position: "bottom", underFilter: { isSelfRef: true } },
      ],
    });
  });
});
