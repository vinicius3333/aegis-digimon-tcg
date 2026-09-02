import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-037.js";
import "../index.js";

describe("BT16-037", () => {
  it("reveals four and adds an Insectoid", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 1, to: "hand" }] }],
    });
  });

  it("grants inherited DP while suspended", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfIsSuspended" } }],
    });
  });

  it("encodes the green level-2 evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT16-037")).toEqual([
      { colors: ["Green"], level: 2, cost: 0, isAlternate: false },
    ]);
  });

  it("adds one Insectoid from the top four and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-037", as: "kokabuterimon" }],
          deck: ["BT1-009", "BT16-037", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokabuterimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT16-037"));

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT16-037")).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-012", "BT1-009", "BT1-010", "BT1-011"]);
  });

  it("bottoms all four revealed cards when no Insectoid is found", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-037", as: "kokabuterimon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kokabuterimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT16-037"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-037")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-013",
      "BT1-009",
      "BT1-010",
      "BT1-011",
      "BT1-012",
    ]);
  });

  it("naturally evolves from Minomon and gains the inherited bonus after attacking", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-004", as: "minomon" }],
        hand: [
          { card: "BT16-037", as: "kokabuterimon" },
          { card: "BT1-071", as: "vegiemon" },
        ],
      },
      1: { security: ["BT1-090"] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("minomon").permanentId,
        instanceId: s.inst("kokabuterimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("minomon").topCard?.cardId === "BT16-037");
    expect(s.perm("minomon").currentDP).toBe(1000);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("minomon").permanentId,
        instanceId: s.inst("vegiemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("minomon").topCard?.cardId === "BT1-071");
    expect(s.perm("minomon").currentDP).toBe(6000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("minomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("minomon").isSuspended);

    expect(s.perm("minomon").currentDP).toBe(7000);
  });
});
