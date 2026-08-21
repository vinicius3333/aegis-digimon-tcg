import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "../index.js";

const compiled = getCompiledCard("EX10-059");

describe("EX10-059 DarknessBagramon", () => {
  it("has complete compiled coverage and the printed DigiXros recipe", () => {
    expect(compiled).toBeDefined();
    expect(compiled!.coverage).toBe("full");
    expect(compiled!.residual).toEqual([]);
    expect(compiled!.digiXrosRequirement).toEqual([{ materials: [{ names: ["Bagramon"] }], count: 3 }]);
  });

  it("requires all 3 Bagra Army trash cards before the deletion effect resolves", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled!.effects!.find((entry) => entry.trigger === trigger);
      expect(effect).toBeDefined();
      expect(effect!.actions).toMatchObject([
        {
          kind: "PlaceUnder",
          target: { filter: { isOpponentHand: true }, count: 1 },
          underFilter: { or: [{ digivolutionBottom: true }, { kind: ["Tamer"] }] },
        },
        {
          kind: "Delete",
          cost: {
            kind: "place",
            target: {
              filter: { zone: "trash", controller: "mine", kind: ["Digimon"] },
              count: 3,
              from: ["trash"],
            },
            destination: "digivolutionStack",
            position: "top",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ]);
    }
  });

  it("copies All Turns effects from level 6 Bagra Army cards in its stack", () => {
    const allTurns = compiled!.effects!.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: {
            copyEffectsFromDigivolution: {
              filter:
                "This Digimon gains all [All Turns] effects on all level 6 [Bagra Army] trait Digimon cards in its digivolution cards",
            },
          },
          duration: "forTheTurn",
        },
      ],
    });
  });
});
