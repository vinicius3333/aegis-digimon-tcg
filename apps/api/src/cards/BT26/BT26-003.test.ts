import { EffectDuration, EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { module } from "./BT26-003.js";
import "../index.js";

const CARD_ID = "BT26-003";

function definition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "TEST",
    set: "TEST",
    nameEn: "Test",
    kinds: ["Digimon"] as never,
    colors: [],
    playCost: 0,
    dp: 0,
    types: [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function source(): CardSource {
  return {
    instanceId: "kyaromon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ kinds: ["DigiEgg"] as never }),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => false,
    hasColor: () => false,
  };
}

describe("BT26-003 Kyaromon", () => {
  it("exposes an inherited mandatory Once Per Turn opponent-attack trigger", () => {
    const effect = module.effectsForTiming(EffectTiming.OnAllyAttack, source())[0]!;
    expect(effect).toMatchObject({ isInherited: true, optional: false, maxPerTurn: 1 });
    expect(
      effect.canTrigger({
        source: source(),
        trigger: { attackerPermanentId: "missing" },
        game: { permanentById: () => undefined },
      } as unknown as EffectContext),
    ).toBe(false);
  });

  it("publicly pays the actual bottom face-down Tamer card and redirects an effect-immune attacker (Q6952)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-010", as: "host", under: [{ card: CARD_ID, as: "kyaromon" }] },
            {
              card: "BT26-090",
              as: "tamer",
              under: [
                { card: "BT1-009", as: "bottom", faceUp: false },
                { card: "BT1-010", as: "upper", faceUp: false },
              ],
            },
            { card: "BT25-032", as: "redirect", dp: 2000 },
          ],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "BT26-014", as: "attacker", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const redirectId = s.perm("redirect").permanentId;
    const redirectCardId = s.perm("redirect").topCard.instanceId;
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("attacker").permanentId,
      "beAffected",
      EffectDuration.Permanent,
    );
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === redirectId));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("upper").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("bottom").instanceId, redirectCardId]),
    );
  });

  it("may pay the cost with no Glowing Dawn target and simply trashes the card (Q6953)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-010", as: "host", under: [{ card: CARD_ID }] },
            { card: "BT26-090", as: "tamer", under: [{ card: "BT1-009", as: "cost", faceUp: false }] },
          ],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT26-014", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 0);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });

  it("requires the bottom card itself to be face-down and never substitutes a higher face-down card", () => {
    const tamer = {
      permanentId: "tamer",
      inBreeding: false,
      topCard: { cardId: "TAMER" },
      stack: [
        { instanceId: "bottom", faceUp: true },
        { instanceId: "upper", faceUp: false },
      ],
    };
    const attacker = { permanentId: "attacker", controllerSeat: 1 };
    const cardSource = source();
    const effect = module.effectsForTiming(EffectTiming.OnAllyAttack, cardSource)[0]!;
    const ctx = {
      source: cardSource,
      trigger: { attackerPermanentId: "attacker" },
      game: {
        permanentById: (id: string) => (id === "attacker" ? attacker : tamer),
        player: () => ({ battleArea: [tamer] }),
        definitionOf: () => definition({ kinds: ["Tamer"] as never }),
      },
    } as unknown as EffectContext;
    expect(effect.canActivate(ctx)).toBe(false);
  });

  it("does not redirect when trashing the selected bottom-card cost fails", async () => {
    const bottom = { instanceId: "bottom", cardId: "BOTTOM", faceUp: false } as CardInstance;
    const tamer = { permanentId: "tamer", inBreeding: false, topCard: { cardId: "TAMER" }, stack: [bottom] };
    const target = { permanentId: "target", inBreeding: false, topCard: { cardId: "TARGET" } };
    const redirectAttack = vi.fn();
    const cardSource = source();
    await module.effectsForTiming(EffectTiming.OnAllyAttack, cardSource)[0]!.resolve({
      source: cardSource,
      game: {
        player: () => ({ battleArea: [tamer, target] }),
        permanentById: (id: string) => (id === "tamer" ? tamer : target),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TAMER" ? definition({ kinds: ["Tamer"] as never }) : definition({ types: ["Glowing Dawn"] }),
      } as unknown as GameAccess,
      ask: { optional: vi.fn(async () => true) },
      fx: { trashDigivolutionCards: vi.fn(async () => []), redirectAttack } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(redirectAttack).not.toHaveBeenCalled();
  });

  it("offers all exact Glowing Dawn Digimon targets but excludes Tamers and near traits", async () => {
    const bottom = { instanceId: "bottom", cardId: "BOTTOM", faceUp: false } as CardInstance;
    const permanents = [
      { permanentId: "tamer", topCard: { cardId: "TAMER" }, stack: [bottom] },
      { permanentId: "one", topCard: { cardId: "ONE" }, stack: [] },
      { permanentId: "two", topCard: { cardId: "TWO" }, stack: [] },
      { permanentId: "near", topCard: { cardId: "NEAR" }, stack: [] },
    ];
    const redirectAttack = vi.fn();
    const cardSource = source();
    await module.effectsForTiming(EffectTiming.OnAllyAttack, cardSource)[0]!.resolve({
      source: cardSource,
      game: {
        player: () => ({ battleArea: permanents }),
        permanentById: (id: string) => permanents.find((p) => p.permanentId === id),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TAMER"
            ? definition({ kinds: ["Tamer"] as never, types: ["Glowing Dawn"] })
            : definition({ types: card.cardId === "NEAR" ? ["Glowing Dawns"] : ["Glowing Dawn"] }),
      } as unknown as GameAccess,
      ask: { optional: vi.fn(async () => true) },
      fx: { trashDigivolutionCards: vi.fn(async () => [bottom]), redirectAttack } as unknown as Primitives,
    } as unknown as EffectContext);
    expect(redirectAttack).toHaveBeenCalledWith(["one", "two"]);
  });
});
