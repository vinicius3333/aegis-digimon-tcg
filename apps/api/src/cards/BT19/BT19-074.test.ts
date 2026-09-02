import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-074.js";

describe("BT19-074", () => {
  it("preserves Blast Digivolve, conditional deletion, and ten-card security trash cost", () => {
    const card = runtimeCompiledCard("BT19-074");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "ConditionalBranch",
            condition: { kind: "zoneCount", zone: "trash", op: "gte", value: 10 },
            ifTrue: [{ kind: "Delete", target: { filter: { controller: "opponent" } } }],
            ifFalse: [
              {
                kind: "Delete",
                target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 6 } } },
              },
            ],
          },
        ],
      })),
      {
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "trash",
            controller: "opponent",
            cost: {
              kind: "return",
              target: { filter: { zone: "trash", kind: ["Digimon", "Tamer", "Option"] }, count: 10 },
              to: "deckTop",
            },
            optional: true,
            abortOnDecline: true,
          },
        ],
      },
    ]);
  });

  it("uses the 10-trash deletion instead of also performing the level-6 deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-074", as: "blast" }],
          trash: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT19-075", as: "high" },
            { card: "BT1-009", as: "low" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blast").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-009");
  });
});
