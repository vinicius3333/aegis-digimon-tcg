import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-075.js";

describe("BT13-075 BT13-075", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"], playCostGte: 10 }, count: "all" },
            restriction: "attackPlayers",
            duration: "untilOpponentTurnEnd",
            optional: false,
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ match: "trait", tokens: ["X Antibody", "Royal Knight"] }],
                },
                count: 1,
                from: ["trash"],
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects[0]?.trigger).toBe("OnPlay");
    expect(compiled.effects[1]?.trigger).toBe("WhenDigivolving");
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: {
            kind: "return",
            to: "deckBottom",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
                nameOrTrait: [{ match: "trait", tokens: ["X Antibody", "Royal Knight"] }],
              },
              count: 1,
            },
          },
        },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-075", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-075");
  });
});
