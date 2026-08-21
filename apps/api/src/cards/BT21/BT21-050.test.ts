import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-050.js";

describe("BT21-050 Cherrymon", () => {
  it("preserves the WG alternate Digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["WG"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("models optional suspension on play and digivolving", () => {
    expect(
      compiled.effects.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving"),
    ).toEqual([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
            optional: true,
          },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
            optional: true,
          },
        ],
      },
    ]);
  });

  it("keeps the suspended WG attack redirect once-per-turn and the inherited play watcher", () => {
    const opponentTurn = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn");
    expect(opponentTurn).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks" }],
    });
    expect(opponentTurn?.actions[0]).toMatchObject({
      actions: [
        {
          kind: "RedirectAttack",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
            count: 1,
          },
          condition: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
          optional: true,
        },
      ],
    });
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", isInherited: true });
    expect(inherited?.actions[0]).toEqual({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          optional: true,
        },
      ],
    });
  });
});
