import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-024.js";

describe("EX1-024 Patamon", () => {
  it("reveals exactly 4 and adds exactly 1 eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-024", as: "patamon" }],
          deck: ["EX1-028", "EX1-029", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX1-028"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX1-028"]);
    expect(s.events.filter((event) => event.kind === "cardRevealed").map((event) => event.cardId)).toEqual([
      "EX1-028",
      "EX1-029",
      "BT1-009",
      "BT1-010",
    ]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "EX1-029", "BT1-009", "BT1-010"]);
  });

  it.each([
    ["Angel", "BT1-055"],
    ["Archangel", "BT1-060"],
    ["Three Great Angels", "BT1-063"],
  ])("accepts the %s trait alternative", async (_trait, matchingCard) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-024", as: "patamon" }],
          deck: [matchingCard, "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === matchingCard));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === matchingCard)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not match a near-trait Angel name or a non-Digimon trait card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-024", as: "patamon" }],
          deck: ["BT1-062", "BT1-061", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-024"));
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("bottom-decks all four non-matches in the player's chosen order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-024", as: "patamon" }],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
            { card: "BT1-012", as: "fourth" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const chosenOrder = [
      s.inst("fourth").instanceId,
      s.inst("second").instanceId,
      s.inst("first").instanceId,
      s.inst("third").instanceId,
    ];
    const decision = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderCards", order: chosenOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(chosenOrder);
  });

  it("has no optional refusal branch because adding an eligible card is mandatory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-024", as: "patamon" }],
          deck: ["EX1-028", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX1-028"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX1-028"]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
  });

  it("can legally evolve from a yellow Digi-Egg and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-005", as: "yellowEgg" }],
        hand: [{ card: "EX1-024", as: "evo" }],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowEgg").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowEgg").topCard.cardId === "EX1-024");
    expect(s.perm("yellowEgg").stack.map(({ cardId }) => cardId)).toEqual(["BT1-005"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([]);
    expect(s.state.memory).toBe(5);
  });

  it("rejects an illegal red Digi-Egg source without changing the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "redEgg" }],
        hand: [{ card: "EX1-024", as: "evo" }],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redEgg").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("redEgg").topCard.cardId).toBe("BT1-001");
    expect(s.perm("redEgg").stack).toHaveLength(0);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX1-024"]);
  });
});
