import { digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-039.js";
import "../index.js";

describe("BT16-039", () => {
  it("reveals four and adds Pulsemon text cards and Abadin Electronics", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          rest: "deckBottom",
          add: [
            {
              count: 1,
              to: "hand",
              filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] },
            },
            {
              count: 1,
              to: "hand",
              filter: { nameOrTrait: [{ tokens: ["Abadin Electronics"], match: "trait" }] },
            },
          ],
        },
      ],
    });
  });

  it("grants inherited DP while its top card has Pulsemon in its text", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }],
    });
  });

  it("encodes the Bibimon alternate evolution requirement", () => {
    expect(digivolutionRequirementsFor("BT16-039")).toEqual([{ names: ["Bibimon"], cost: 0, isAlternate: true }]);
  });

  it("adds both available categories from the revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-039", as: "pulsemon" }],
          deck: ["BT16-034", "BT17-090", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT16-034"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-034")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-090")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("adds the one available category when no second category is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-039", as: "pulsemon" }],
          deck: ["BT16-034", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT16-034"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT16-034")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT17-090")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
  });

  it("does not take one card twice when it matches both categories", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-039", as: "pulsemon" }],
          deck: ["BT16-039", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pulsemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.filter((card) => card.cardId === "BT16-039").length === 1);

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "BT16-039")).toHaveLength(1);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
  });

  it("naturally evolves from Bibimon through the zero-cost alternate route", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT17-003", as: "bibimon" }, hand: [{ card: "BT16-039", as: "pulsemon" }] },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bibimon").permanentId,
        instanceId: s.inst("pulsemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bibimon").topCard?.cardId === "BT16-039");

    expect(s.perm("bibimon").stack.map((card) => card.cardId)).toEqual(["BT17-003", "BT16-039"]);
    expect(s.state.memory).toBe(0);
  });

  it("naturally keeps the inherited +1000 DP on a Pulsemon-text evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-039", as: "pulsemon" }], hand: [{ card: "BT16-043", as: "runner" }] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pulsemon").permanentId,
        instanceId: s.inst("runner").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pulsemon").topCard?.cardId === "BT16-043");

    expect(s.perm("pulsemon").currentDP).toBe(5000);
  });

  it("does not apply the inherited boost when the top card lacks Pulsemon text", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-039", as: "pulsemon" }], hand: [{ card: "BT17-046", as: "gargomon" }] },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("pulsemon").permanentId,
        instanceId: s.inst("gargomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("pulsemon").topCard?.cardId === "BT17-046");

    expect(s.perm("pulsemon").currentDP).toBe(6000);
  });
});
