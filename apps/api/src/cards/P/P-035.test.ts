import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import "./P-035.js";

// audit-cases: 5
memoryBoostTests({
  cardId: "P-035",
  name: "Red Memory Boost!",
  colorSource: "BT1-009",
  matchingDigimon: "BT1-009",
  offColorDigimon: "BT1-027",
});

describe("P-035 Red Memory Boost!", () => {
  it("reveals every card and honors the chosen deck-bottom order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT5-007", as: "redSource" }],
          hand: [{ card: "P-035", as: "option" }],
          deck: [
            { card: "BT1-009", as: "redDigimon" },
            { card: "ST1-16", as: "firstRest" },
            { card: "BT1-045", as: "secondRest" },
            { card: "BT1-089", as: "thirdRest" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    const orderDecision = [...s.decisions].reverse().find(({ req }) => req.kind === "orderCards")!.req;

    expect(orderDecision.options?.visibleCards?.map((card) => card.instanceId)).toEqual([
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
      s.inst("thirdRest").instanceId,
    ]);
    const chosenOrder = [s.inst("thirdRest").instanceId, s.inst("firstRest").instanceId, s.inst("secondRest").instanceId];
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: orderDecision.decisionId,
      response: { kind: "orderCards", order: chosenOrder },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.map((card) => card.instanceId).join(",") === chosenOrder.join(","));

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(chosenOrder);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redDigimon").instanceId)).toBe(true);
  });
});
