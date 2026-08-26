import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-083.js";
import "./BT9-083.js";
describe("BT9-083 Omnimon: Merciful Mode", () => {
  it("matches catalog values, alternate evolution, and sequential effect IR", () => {
    expect(getCardDefinition("BT9-083")).toMatchObject({
      colors: ["White"], level: 7, playCost: 15, dp: 15000,
      evoCosts: [{ color: "Red", level: 6, memoryCost: 6 }, { color: "Blue", level: 6, memoryCost: 6 }, { color: "Yellow", level: 6, memoryCost: 6 }, { color: "Green", level: 6, memoryCost: 6 }],
      types: ["Holy Warrior"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Omnimon"], cost: 3, isAlternate: true }],
      effects: [
        { trigger: "WhenDigivolving", actions: [{ kind: "Delete", scaling: { unit: "digivolutionCards", filter: { forms: ["Mega"] } } }, { kind: "Return", to: "deckBottom", order: "any", target: { count: 10, upTo: true } }] },
        {
          trigger: "StartOfYourTurn",
          actions: [
            { kind: "Trash", target: { filter: { zone: "digivolutionCards", position: "top" } } },
            { kind: "Trash", condition: { kind: "ifThisEffectActed" }, target: { filter: { zone: "security", controller: "opponent", position: "top" } } },
          ],
        },
      ],
    });
  });

  it("deletes per Mega source and returns up to 10 opposing trash cards to deck bottom", async () => {
    const trash = Array.from({ length: 10 }, (_, i) => ({ card: i % 2 ? "BT1-001" : "BT1-002", as: `trash${i}` }));
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-004", as: "base", under: ["BT6-111"] }],
          hand: [{ card: "BT9-083", as: "evolving" }],
        },
        1: { battleArea: ["BT2-047"], trash },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.length === 1 &&
        s.state.players[1]!.eggDeck.length === 10 &&
        s.state.players[1]!.battleArea.length === 0,
    );
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.eggDeck).toHaveLength(10);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT2-047"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("trashes its top source and the opponent's top security instead of moving security to hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT9-083",
            as: "mercifulMode",
            under: [{ card: "BT5-111", as: "topSource" }],
          },
        ],
      },
      1: { security: [{ card: "BT1-010", as: "securityTop" }] },
    });

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("mercifulMode"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("topSource").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("securityTop").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("publishes opponent trash identities, honors bottom order, and returns Digi-Eggs to the egg deck", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-083", as: "mercifulMode" }] },
        1: {
          deck: [{ card: "BT1-011", as: "existing" }],
          trash: [
            { card: "BT1-001", as: "egg" },
            { card: "BT1-009", as: "firstDigimon" },
            { card: "BT1-010", as: "secondDigimon" },
          ],
        },
      },
      { autoOrderCards: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("mercifulMode"));

    expect(new Set(s.state.players[1]!.deck.map((card) => card.instanceId))).toEqual(
      new Set([s.inst("existing").instanceId, s.inst("firstDigimon").instanceId, s.inst("secondDigimon").instanceId]),
    );
    expect(s.state.players[1]!.eggDeck.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId]);
  });
});
