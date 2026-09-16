import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-005.js";

describe("EX10-005 Pagumon", () => {
  it("matches the catalog and carries the printed inherited contract", () => {
    expect(getCardDefinition("EX10-005")).toMatchObject({
      cardId: "EX10-005",
      nameEn: "Pagumon",
      colors: ["Purple"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText: "[Your Turn] [Once Per Turn] When your opponent's deck is trashed from, ＜Draw 1＞",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "onDiscardLibrary",
              sourceFilter: { controller: "opponent" },
              actions: [{ kind: "Draw", amount: 1, controller: "mine" }],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("draws 1 when a played effect trashes the opponent's deck on your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX10-005", as: "pagumon" }] }],
          hand: [{ card: "BT14-077", as: "skullsatamon" }],
          deck: [
            { card: "BT1-009", as: "mine1" },
            { card: "BT1-010", as: "mine2" },
            { card: "BT1-011", as: "drawn" },
            "BT1-012",
          ],
        },
        1: { deck: ["BT1-013", "BT1-014", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullsatamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1 && s.state.players[1]!.trash.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("mine1").instanceId,
      s.inst("mine2").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-012"]);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("draws only once a turn and resets on your next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX10-005", as: "pagumon" }] }],
          hand: [
            { card: "BT14-077", as: "first" },
            { card: "BT14-077", as: "second" },
            { card: "BT14-077", as: "third" },
          ],
          deck: [
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
          ],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const playAndCountDraws = async (alias: string, expectedDraws: number) => {
      const before = s.state.players[0]!.hand.length;
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      const expected = before - 1 + expectedDraws;
      await settle(() => s.state.players[0]!.hand.length === expected, 60);
      expect(s.state.players[0]!.hand).toHaveLength(expected);
    };

    await playAndCountDraws("first", 1);
    await playAndCountDraws("second", 0);
    const opponentTrashAfterFirstTurn = s.state.players[1]!.trash.length;
    expect(opponentTrashAfterFirstTurn).toBe(4);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    await playAndCountDraws("third", 1);
    expect(s.state.players[1]!.trash).toHaveLength(6);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("ignores a mill of your own deck", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: [{ card: "EX10-005", as: "pagumon" }] },
          { card: "BT2-068", as: "selfmill" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { deck: ["BT1-013", "BT1-014"] },
    });
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("selfmill").permanentId])).toBe(1);
    await settle(() => s.state.players[0]!.trash.length >= 3, 60);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-012"]);
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });

  it("does not draw on the opponent's turn ([Your Turn] window)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX10-005", as: "pagumon" }] }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          hand: [{ card: "BT14-077", as: "skullsatamon" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("skullsatamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length >= 2 && s.state.players[0]!.trash.length >= 2, 60);

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-012", "BT1-013"]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-011"]);
  });

  it("Q5011: does not draw when opponent deck cards are revealed and then trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX10-005", as: "pagumon" }], dp: 20_000 }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT12-071", as: "ancient" }],
          deck: ["BT12-066", "BT1-013", "BT1-014"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length >= 2, 60);

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-013", "BT1-014"]),
    );
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it("draws when a real deck-trash effect mills the opponent's deck (no synthetic payload)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: [{ card: "EX10-005", as: "pagumon" }] },
          { card: "EX10-009", as: "creepymon" },
        ],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
      1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
    });
    await s.engine.recomputeContinuousEffects();
    const handBefore = s.state.players[0]!.hand.length;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("creepymon").permanentId])).toBe(1);
    await settle(() => s.state.players[1]!.trash.length === 5 && s.state.players[0]!.hand.length === handBefore + 1);

    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("carries its inherited draw through the real Digi-Egg route: hatch -> digivolve -> battle area", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "EX10-005", as: "egg" }],
          hand: [
            { card: "BT2-067", as: "demidevimon" },
            { card: "BT14-077", as: "skullsatamon" },
          ],
          deck: [
            { card: "BT1-013", as: "evoDraw" },
            { card: "BT1-014", as: "turnDraw" },
            { card: "BT1-009", as: "milled1" },
            { card: "BT1-012", as: "milled2" },
            { card: "BT1-013", as: "drawn" },
            "BT1-014",
          ],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-012", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX10-005");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    expect(s.state.players[0]!.eggDeck).toHaveLength(0);

    await advance(s.engine).waitForMainPhase(0);
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("demidevimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT2-067");

    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("skullsatamon").instanceId,
      s.inst("evoDraw").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard!.cardId).toBe("BT2-067");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const opponentDeckBefore = s.state.players[1]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullsatamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.length === opponentDeckBefore - 2);
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("evoDraw").instanceId,
      s.inst("turnDraw").instanceId,
      s.inst("drawn").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("milled1").instanceId,
      s.inst("milled2").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
