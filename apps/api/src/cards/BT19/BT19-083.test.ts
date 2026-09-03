import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-083 Rika Nonaka", () => {
  it("resolves its reveal search from a public play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT19-083", as: "tamer" }], deck: ["BT19-030", "BT1-009", "BT1-009"] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT19-030"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-030");
  });

  it("preserves dual reveal searches, post-use cost threshold, suspend cost, and Security play", () => {
    const card = runtimeCompiledCard("BT19-083");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            add: [
              {
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Renamon", "Kyubimon", "Taomon", "Sakuyamon"], match: "name" }],
                },
                count: 1,
                to: "hand",
              },
              {
                filter: {
                  controllerDefault: "mine",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }],
                },
                count: 1,
                to: "hand",
              },
            ],
            rest: "deckBottom",
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenOptionUsed",
            fireCondition: {
              kind: "triggerOptionCostAtLeast",
              value: 2,
            },
            actions: [
              {
                kind: "GainMemory",
                amount: 1,
                cost: {
                  kind: "suspend",
                  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                },
                optional: true,
                abortOnDecline: true,
              },
            ],
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            payCost: false,
          },
        ],
      },
    ]);
  });
});
