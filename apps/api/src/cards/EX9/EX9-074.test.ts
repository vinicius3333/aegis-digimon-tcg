import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-074.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX9-074", () => {
  it("keeps the color DP bonus on both turns and updates it when a source color disappears", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-074", as: "host", under: ["BT1-009", "BT1-016", "EX9-038"] }],
        deck: ["BT1-048", "BT1-049"],
      },
      1: { deck: ["BT1-050", "BT1-051"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(12000);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(12000);
    const placedSource = s.perm("host").stack.find((card) => card.cardId === "EX9-038")!;
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [placedSource.instanceId], 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(11000);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX9-038");
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(11000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("places a DM source on real play, deletes its matching color, then Rush checks twice", async () => {
    const options = { autoAcceptOptional: true, autoSelectCards: true };
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-074", as: "card" }], trash: ["EX9-008"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "red" },
            { card: "BT1-027", as: "blue" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      options,
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await settle();
    const host = s.state.players[0]!.battleArea[0]!;
    expect(host.topCard.cardId).toBe("EX9-074");
    expect(host.stack.map((card) => card.cardId)).toEqual(["EX9-008"]);
    expect(host.currentDP).toBe(11000);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-027"]);
    expect(s.state.memory).toBe(0);
    options.autoAcceptOptional = false;
    options.autoSelectCards = false;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: host.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const raid = s.state.pendingDecision!;
    expect(raid.kind).toBe("selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: raid.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-027"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["EX9-035", "EX9-038"])(
    "digivolves on a legal red level-four stack and places %s above the original stack",
    async (sourceCard) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-016", as: "host", under: ["BT1-009"] }],
            hand: [{ card: "EX9-074", as: "evo" }],
            deck: ["BT1-048"],
            trash: [sourceCard],
          },
          1: {
            battleArea: [
              { card: "BT1-064", as: "green" },
              { card: "BT1-027", as: "blue" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst("evo").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("host").topCard.cardId).toBe("EX9-074");
      expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-016", sourceCard]);
      expect(s.perm("host").currentDP).toBe(12000);
      expect(s.state.memory).toBe(5);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-048"]);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-027"]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("has Rush and Security A. +1", () =>
    expect(compiled.effects?.flatMap((entry) => entry.keywords)).toEqual(
      expect.arrayContaining([
        { keyword: "Rush", raw: "＜Rush＞" },
        { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
      ]),
    ));

  it.each(["EX9-018", "BT1-016"])("cannot place ineligible trash card %s on play", async (cardId) => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX9-074", as: "card" }], trash: [cardId] },
        1: { battleArea: [{ card: "BT1-009", as: "red" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.currentDP).toBe(10000);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([cardId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still deletes an existing source-color target after declining the trash placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-016", as: "host", under: ["BT1-009"] }],
          hand: [{ card: "EX9-074", as: "evo" }],
          deck: ["BT1-048"],
          trash: ["EX9-035"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "red" },
            { card: "BT1-064", as: "green" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-074");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-016"]);
    expect(s.perm("host").currentDP).toBe(11000);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX9-035"]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-064"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("encodes the printed seven-color evolution requirements and all-turn DP scaling", () => {
    expect(compiled.digivolutionRequirement).toEqual(
      expect.arrayContaining(
        ["Red", "Blue", "Yellow", "Green", "Black", "Purple", "White"].map((color) => ({
          color,
          level: 4,
          cost: 5,
          isAlternate: true,
        })),
      ),
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
      scaling: { unit: "digivolutionCardColors", per: 1 },
    });
  });

  it("places an optional level-four-or-lower DM Digimon from trash and deletes a color-matching opponent Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "PlaceUnder", position: "top", optional: true },
          { kind: "Delete", condition: { kind: "not" }, target: { filter: { colorMatchesAnyDigivolutionCard: true } } },
          { kind: "DeletePerColor", condition: { kind: "selfDigivolutionStackDistinctColorCount" } },
        ],
      });
  });
});
