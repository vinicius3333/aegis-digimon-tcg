import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT23/BT23-047.js";
import { memoryBoostColorRulings } from "./qaRulings1.testSupport.js";
import "./P-035.js";

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

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    const orderDecision = [...s.decisions].reverse().find(({ req }) => req.kind === "orderCards")!.req;

    expect(orderDecision.options?.visibleCards?.map((card) => card.instanceId)).toEqual([
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
      s.inst("thirdRest").instanceId,
    ]);
    const chosenOrder = [
      s.inst("thirdRest").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision.decisionId,
        response: { kind: "orderCards", order: chosenOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.map((card) => card.instanceId).join(",") === chosenOrder.join(","));

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(chosenOrder);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redDigimon").instanceId)).toBe(true);
  });
});

describe("P-035 Red Memory Boost! — KB Q&A rulings (checked by BT23-047 Examon)", () => {
  it("is placed by its [Security] effect first, then Examon's security-removal effect may trash it (Q5315)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-047", as: "examon" }],
          deck: ["BT1-009", "BT1-010", "BT1-019", "BT1-009"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          deck: ["BT1-009", "BT1-010", "BT1-019", "BT1-009"],
          security: [{ card: "P-035", as: "boost" }, "BT1-019", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const boostId = s.inst("boost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const placedFromSecurity = s.events.findIndex(
      (event) => event.kind === "effectResolved" && event.sourceCardId === "P-035",
    );
    const examonTriggered = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT23-047" && event.timing === "whenSecurityRemoved",
    );
    expect(placedFromSecurity).toBeGreaterThan(-1);
    expect(examonTriggered).toBeGreaterThan(placedFromSecurity);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === boostId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(boostId);
  });
});

memoryBoostColorRulings({
  cardId: "P-035",
  name: "Red Memory Boost!",
  sameColorOption: "ST1-16",
  colorRequirementQno: "Q4149",
  delayQno: "Q4150",
});
