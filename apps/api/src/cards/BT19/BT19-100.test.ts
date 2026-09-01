import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-100 D-Reaper Zone", () => {
  it("trashes its top security and replaces it face-up through a public Option play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT19-100", as: "option" }], security: ["BT1-001"], battleArea: [{ card: "EX2-046" }] } },
      { autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT19-100"));
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT19-100" && card.faceUp)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-001");
  });

  it("preserves conditional security placement, scaled attack reduction, and optional Security play", () => {
    const card = runtimeCompiledCard("BT19-100");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        isSecurity: true,
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOpponentAttacks",
            fireCondition: {
              kind: "allYoursMatchFilter",
              filter: {
                kind: ["Digimon", "Tamer"],
                nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
              },
            },
            actions: [
              {
                kind: "ModifyDP",
                amount: -1000,
                duration: "forTheTurn",
                scaling: { per: 1, unit: "digivolutionCardsOfFiltered" },
              },
            ],
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addTop",
            faceUp: true,
            condition: { kind: "youHaveNone" },
            cost: { kind: "trash" },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controller: "mine",
                playCostLte: 0,
                playCostLteScaling: {
                  per: 1,
                  filter: {
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }],
                  },
                  unit: "digivolutionCardsOfFiltered",
                },
                nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
              },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            optional: true,
          },
        ],
      },
    ]);
  });
});
