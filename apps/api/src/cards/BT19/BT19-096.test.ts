import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-096 Hornet Eraser", () => {
  it("places Royal Base from trash and deletes an opponent through a public Option play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-096", as: "option" }],
          trash: ["BT19-048"],
          battleArea: [{ card: "BT19-050" }, { card: "BT19-062" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT19-048" && card.faceUp)).toBe(true);
  });

  it("preserves face-up Royal Base recovery, face-up-security budget scaling, and Security activation", () => {
    const card = runtimeCompiledCard("BT19-096");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addBottom",
            controller: "mine",
            source: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                zone: "trash",
                nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
              },
              count: 1,
            },
            faceUp: true,
            optional: true,
          },
          {
            kind: "DeleteBudget",
            filter: { controller: "opponent", kind: ["Digimon"] },
            budget: 8,
            upTo: true,
            scaling: {
              per: 1,
              filter: { controller: "mine", faceUp: true },
              unit: "security",
              budgetAdd: 2,
            },
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "ActivateMain" }],
      },
    ]);
  });
});
