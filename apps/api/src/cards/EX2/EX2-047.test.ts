import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-047.js";

const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

describe("EX2-047 ADR-03 Pendulum Feet", () => {
  it("matches the catalog and compiles its complete search", () => {
    expect(getCardDefinition("EX2-047")).toMatchObject({
      cardId: "EX2-047",
      nameEn: "ADR-03 Pendulum Feet",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 3,
      dp: 3000,
      evoCosts: [],
      forms: ["D-Reaper"],
      types: ["AA Defense Agent"],
      effectText:
        "[On Play] Reveal the top 3 cards of your deck. Add 1 card with [D-Reaper] in its traits and 1 [ADR-02 Searcher] among them to your hand. Place the remaining cards at the bottom of your deck in any order.",
    });
    const card = runtimeCompiledCard("EX2-047");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled).toEqual(card);
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "deckBottom",
            add: [
              {
                count: 1,
                to: "hand",
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
                },
              },
              {
                count: 1,
                to: "hand",
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["ADR-02 Searcher"], match: "name" }],
                },
              },
            ],
          },
        ],
      },
    ]);
  });

  it("adds one D-Reaper and one ADR-02 Searcher from the top three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-047", as: "pendulum" }],
          deck: [
            { card: "EX2-050", as: "dreaper" },
            { card: "EX2-046", as: "searcher" },
            { card: "BT1-009", as: "miss" },
          ],
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pendulum").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("dreaper").instanceId, s.inst("searcher").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("adds as many qualifying cards as possible when one category is absent (Q3343)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-047", as: "pendulum" }],
          deck: [
            { card: "EX2-050", as: "dreaper" },
            { card: "EX2-048", as: "secondDReaper" },
            { card: "BT1-009", as: "miss" },
          ],
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pendulum").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("dreaper").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("dreaper").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("secondDReaper").instanceId,
      s.inst("miss").instanceId,
    ]);
  });

  it("lets the player choose the bottom order for unselected revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-047", as: "pendulum" }],
          deck: [
            { card: "EX2-050", as: "dreaper" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-013", as: "second" },
          ],
          security: INERT_SECURITY,
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pendulum").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const ordering = s.decisions.at(-1)!.req;
    expect(ordering.kind).toBe("orderCards");
    expect(ordering.options?.candidateInstanceIds).toEqual([s.inst("first").instanceId, s.inst("second").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: [s.inst("second").instanceId, s.inst("first").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dreaper").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("second").instanceId,
      s.inst("first").instanceId,
    ]);
  });

  it("does not add cards when none of the revealed cards match either requirement", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX2-047", as: "pendulum" }],
        deck: ["BT1-009", "BT1-013", "BT1-014"],
        security: INERT_SECURITY,
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pendulum").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
