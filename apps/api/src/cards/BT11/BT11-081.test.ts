import { digiXrosRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-081.js";
import "./BT11-020.js";

describe("BT11-081 MadLeomon: Armed Mode", () => {
  it("maps catalog facts and every printed effect to IR", () => {
    expect(getCardDefinition("BT11-081")).toMatchObject({
      cardId: "BT11-081",
      colors: ["Purple"],
      level: 4,
      playCost: 6,
      dp: 5000,
      types: ["Undead", "Bagra Army"],
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OpponentsTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenEffectAddsToOpponentHand",
            actions: [{ kind: "Draw", cost: { target: { filter: { hostFilter: { isSelfRef: true } } } } }],
          },
        ],
      },
      { trigger: "OnDeletion", keywords: [{ keyword: "Save" }] },
      { trigger: "OpponentsTurn", isInherited: true, actions: [{ kind: "SubTrigger" }] },
    ]);
  });

  it("publishes and executes its two-material DigiXros -2 recipe", async () => {
    expect(digiXrosRequirementFor("BT11-081")).toEqual([
      {
        materials: [{ names: ["MadLeomon"] }, { traits: ["Bagra Army"] }],
        count: 2,
      },
    ]);
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT11-081", as: "armed-mode" },
          { card: "BT10-077", as: "madleomon" },
          { card: "BT11-082", as: "bagra-army" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("armed-mode").instanceId,
        digiXros: { materialInstanceIds: [s.inst("madleomon").instanceId, s.inst("bagra-army").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard, stack }) => topCard?.cardId === "BT11-081" && stack.length === 2),
    );

    expect(s.state.memory).toBe(8);
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT11-081")!;
    expect(played.stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT10-077", "BT11-082"]));
  });

  it("trashes one own source and draws twice from public opponent reveals, then resets next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-081",
              as: "madleo",
              under: [
                { card: "BT2-008", as: "sourceA" },
                { card: "BT11-075", as: "sourceB" },
              ],
            },
            { card: "BT11-082", as: "other", under: ["BT10-077"] },
          ],
          deck: [
            { card: "BT1-009", as: "draw1" },
            { card: "BT1-010", as: "draw2" },
            { card: "BT1-011", as: "draw3" },
            { card: "BT1-012", as: "draw4" },
            { card: "BT1-015", as: "draw5" },
            { card: "BT1-020", as: "draw6" },
          ],
        },
        1: {
          hand: [
            { card: "BT11-020", as: "gaomonA" },
            { card: "BT11-020", as: "gaomonB" },
            { card: "BT11-020", as: "gaomonC" },
          ],
          deck: [
            { card: "BT1-009", as: "rest1" },
            { card: "BT11-090", as: "tamer1" },
            { card: "BT11-025", as: "gaogamon1" },
            { card: "BT1-009", as: "rest2" },
            { card: "BT11-090", as: "tamer2" },
            { card: "BT11-025", as: "gaogamon2" },
            { card: "BT1-009", as: "normalDraw" },
            { card: "BT1-009", as: "rest3" },
            { card: "BT11-090", as: "tamer3" },
            { card: "BT11-025", as: "gaogamon3" },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const sourceAId = s.inst("sourceA").instanceId;
    const sourceBId = s.inst("sourceB").instanceId;
    const draw1Id = s.inst("draw1").instanceId;
    const draw2Id = s.inst("draw2").instanceId;
    const draw3Id = s.inst("draw3").instanceId;
    const draw4Id = s.inst("draw4").instanceId;
    const draw5Id = s.inst("draw5").instanceId;
    const draw6Id = s.inst("draw6").instanceId;
    preferred.push(sourceAId);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaomonA").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === draw2Id));

    expect(s.perm("madleo").stack.map(({ instanceId }) => instanceId)).toEqual([sourceBId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceAId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([draw1Id, draw2Id]),
    );

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaomonB").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("madleo").stack.map(({ instanceId }) => instanceId)).toEqual([sourceBId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceAId]);

    s.state.turnSeat = 0;
    s.state.memory = 10;
    s.state.isFirstPlayersFirstTurn = false;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const resetTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaomonC").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === draw5Id));

    expect(s.perm("madleo").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([sourceAId, sourceBId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([draw1Id, draw2Id, draw3Id, draw4Id, draw5Id]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([draw6Id]);
    expect(s.perm("other").stack).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await resetTurn;
  });

  it("uses Save to place itself under one of its Tamers on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-081", as: "madleo" },
            { card: "BT11-092", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cardId = s.perm("madleo").topCard.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("madleo").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === cardId));

    expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === cardId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === cardId)).toBe(false);
  });

  it("gains 1 memory when inherited and trashed by an effect on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-082", as: "host", under: [{ card: "BT11-081", as: "source" }] }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 1);
    await settle(() => s.state.memory === -1);

    expect(s.state.memory).toBe(-1);
  });
});
