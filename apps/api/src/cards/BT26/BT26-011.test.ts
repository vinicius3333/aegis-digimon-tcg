import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { module } from "./BT26-011.js";
import "../index.js";

const CARD_ID = "BT26-011";

function source(): CardSource {
  return {
    instanceId: "buraimon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => ({ permanentId: "buraimon-permanent" }),
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
  } as unknown as CardSource;
}

describe("BT26-011 Buraimon", () => {
  it("evolves from an off-color Lv.3 TS Digimon for 2 and rejects a non-TS peer", async () => {
    const positive = setupEngine({
      0: {
        battleArea: [{ card: "BT25-078", as: "base" }],
        hand: [{ card: CARD_ID, as: "buraimon" }],
        deck: ["BT1-009"],
      },
    });
    positive.state.memory = 2;
    expect(
      positive.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: positive.perm("base").permanentId,
        instanceId: positive.inst("buraimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => positive.perm("base").topCard.cardId === CARD_ID);
    expect(positive.state.memory).toBe(0);
    expect(positive.perm("base").stack.at(-1)?.cardId).toBe("BT25-078");

    const negative = setupEngine({
      0: { battleArea: [{ card: "EX8-056", as: "base" }], hand: [{ card: CARD_ID, as: "buraimon" }] },
    });
    negative.state.memory = 2;
    expect(
      negative.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: negative.perm("base").permanentId,
        instanceId: negative.inst("buraimon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(negative.state.memory).toBe(2);
  });

  it("matches Chronomon in every printed field plus exact Shaman, not a near trait (Q6965)", async () => {
    const cardSource = source();
    const cards = ["name", "inherited", "rule", "requirement", "shaman", "near"].map((instanceId) => ({
      instanceId,
      cardId: instanceId,
    }));
    const definitions: Record<string, CardDefinition> = {
      name: { kinds: [CardKind.Digimon], nameEn: "Chronomon: Holy Mode", types: [] } as unknown as CardDefinition,
      inherited: {
        kinds: [CardKind.Digimon],
        nameEn: "Inherited",
        types: [],
        inheritedEffectText: "Chronomon",
      } as unknown as CardDefinition,
      rule: {
        kinds: [CardKind.Digimon],
        nameEn: "Rule",
        types: [],
        effectText: "[Rule] Name: Chronomon",
      } as unknown as CardDefinition,
      requirement: {
        kinds: [CardKind.Digimon],
        nameEn: "Req",
        types: [],
        linkRequirement: "[Link] Chronomon: Cost 2",
      } as unknown as CardDefinition,
      shaman: { kinds: [CardKind.Digimon], nameEn: "Trait", types: ["Shaman"] } as unknown as CardDefinition,
      near: { kinds: [CardKind.Digimon], nameEn: "Near", types: ["Shamanism"] } as unknown as CardDefinition,
    };
    const selectCards = vi.fn(async (_ctx, request: { candidates: string[] }) => {
      expect(new Set(request.candidates)).toEqual(new Set(["name", "inherited", "rule", "requirement", "shaman"]));
      return [];
    });
    const ctx = {
      source: cardSource,
      game: { player: () => ({ hand: cards }), definitionOf: (card: { cardId: string }) => definitions[card.cardId]! },
      ask: { selectCards },
      fx: {},
    } as unknown as EffectContext;
    await module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve(ctx);
    expect(selectCards).toHaveBeenCalledOnce();
  });

  it("plays for 5, pays exactly one matching card, then draws 2", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "buraimon" },
            { card: "BT26-016", as: "cost" },
          ],
          deck: [
            { card: "BT1-009", as: "one" },
            { card: "BT1-010", as: "two" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("buraimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(new Set(s.state.players[0]!.hand.map((card) => card.cardId))).toEqual(new Set(["BT1-009", "BT1-010"]));
  });

  it("does not draw when the selected trash cost fails", async () => {
    const cardSource = source();
    const cost = { instanceId: "cost", cardId: "COST" };
    const draw = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ hand: [cost] }),
        definitionOf: () => ({ kinds: [CardKind.Digimon], nameEn: "Chronomon", types: [] }),
      },
      ask: { selectCards: async () => [cost.instanceId] },
      fx: { trash: async () => [], draw },
    } as unknown as EffectContext;
    await module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!.resolve(ctx);
    expect(draw).not.toHaveBeenCalled();
  });

  it("publishes Raid both as the top card and inherited from a real stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "top" },
          { card: "ST8-07", as: "host", under: [{ card: CARD_ID, as: "source" }] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
  });

  it("uses printed Raid to redirect a player attack to the highest-DP unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "attacker" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-010", as: "high", dp: 7000 },
          ],
          security: 1,
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("high").permanentId),
    ).toBe(true);
  });
});
