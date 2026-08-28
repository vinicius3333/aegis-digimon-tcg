import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-070.js";

const GULFMON = "BT17-070";
const DARK_MASTERS_TEXT = "BT15-027";

describe("BT17-070 Gulfmon", () => {
  it("uses the place-as-cost effect for both On Play and When Digivolving", () => {
    const effects = compiled.effects.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect.actions[0]).toMatchObject({
        kind: "Delete",
        target: {
          filter: expect.objectContaining({ controller: "opponent", levelComparison: { op: "lte", value: 5 } }),
          count: 1,
        },
      });
      expect(effect.actions[0]!.cost).toMatchObject({
        kind: "place",
        target: expect.objectContaining({
          filter: expect.objectContaining({
            controller: "mine",
            levels: [5],
            nameOrTrait: [{ tokens: ["Dark Masters"], match: "text" }],
          }),
          from: ["hand", "trash"],
        }),
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      });
    }
  });

  it("returns exactly seven cards from the opponent's trash before unsuspending", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenAttacking")?.actions[0];
    expect(action).toMatchObject({
      kind: "Unsuspend",
      cost: { kind: "return", target: { filter: { zone: "trash", controller: "opponent" }, count: 7 } },
    });
  });

  it("plays naturally, places a level-5 Dark Masters-text card, and deletes only a level-5 target", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: GULFMON, as: "gulfmon" }, { card: DARK_MASTERS_TEXT, as: "material" }],
        },
        1: { battleArea: [{ card: "BT17-068", as: "levelFive" }, { card: "BT17-069", as: "levelSix" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const levelFiveId = s.perm("levelFive").permanentId;
    const levelSixId = s.perm("levelSix").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gulfmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === GULFMON));

    const gulf = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === GULFMON)!;
    expect(gulf.stack.some((card) => card.cardId === DARK_MASTERS_TEXT)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelFiveId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelSixId)).toBe(true);
  });

  it("still pays the placement cost when no opposing level-5 target exists", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: GULFMON, as: "gulfmon" }, { card: DARK_MASTERS_TEXT, as: "material" }],
        },
        1: { battleArea: [{ card: "BT17-069", as: "levelSix" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gulfmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === GULFMON));

    const gulf = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === GULFMON)!;
    expect(gulf.stack.some((card) => card.cardId === DARK_MASTERS_TEXT)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("resolves the same placement-and-delete effect after a legal digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-068", as: "mephistomon" }],
          hand: [{ card: GULFMON, as: "gulfmon" }],
          trash: [{ card: DARK_MASTERS_TEXT, as: "material" }],
        },
        1: { battleArea: [{ card: "BT17-068", as: "levelFive" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const levelFiveId = s.perm("levelFive").permanentId;

    // BT17-068's effect text contains [Dark Masters], so the alternate level-5 route is legal.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mephistomon").permanentId,
        instanceId: s.inst("gulfmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mephistomon").topCard.cardId === GULFMON);

    expect(s.perm("mephistomon").stack.some((card) => card.cardId === DARK_MASTERS_TEXT)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === levelFiveId)).toBe(false);
  });

  it("returns seven cards including a Digi-Egg to the correct deck and unsuspends after attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GULFMON, as: "gulfmon" }] },
        1: {
          trash: ["BT1-001", "BT1-009", "BT1-012", "BT1-013", "BT1-027", "BT1-028", "BT1-030"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gulfmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("gulfmon").isSuspended);

    expect(s.perm("gulfmon").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.eggDeck.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[1]!.deck).toHaveLength(6);
  });
});
