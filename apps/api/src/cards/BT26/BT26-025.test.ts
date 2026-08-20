import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming, Phase, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-025.js";
import "../index.js";

const CARD_ID = "BT26-025";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT26",
    nameEn: over.nameEn ?? "Liollmon",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? (["Yellow"] as never),
    playCost: over.playCost ?? 3,
    dp: over.dp ?? 3000,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "liollmon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-025 inherited [When Attacking]", () => {
  it("can recover when the security stack is empty without adding a card to hand", async () => {
    const players = [{ seat: 0 as Seat, security: [], hand: [] }];
    const game: GameAccess = {
      player: () => players[0] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      definitionOf: () => fakeDef(),
    } as unknown as GameAccess;
    const securityToHand = vi.fn<(...args: any[]) => any>();
    const recoverToSecurity = vi.fn<(...args: any[]) => any>();
    const fx = { securityToHand, recoverToSecurity } as unknown as Primitives;
    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask: {} } as unknown as EffectContext;

    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!;
    expect(effect.canActivate?.(ctx)).not.toBe(false);
    await effect.resolve(ctx);

    expect(securityToHand).not.toHaveBeenCalled();
    expect(recoverToSecurity).toHaveBeenCalledWith(0, 1);
  });
});

describe("BT26-025 security placement cost", () => {
  it("does not recover when placing the top security card under the Tamer fails", async () => {
    const security = { instanceId: "security", cardId: "SECURITY" };
    const tamer = {
      permanentId: "tamer",
      topCard: { cardId: "TAMER" },
      stack: [],
      inBreeding: false,
    };
    const source = makeSource();
    const recoverToSecurity = vi.fn();
    const ctx = {
      source,
      game: {
        player: () => ({ security: [security], battleArea: [tamer] }),
        permanentById: () => tamer,
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TAMER" ? fakeDef({ kinds: [CardKind.Tamer] as never, types: ["Glowing Dawn"] }) : fakeDef(),
      },
      fx: { placeUnder: async () => [], recoverToSecurity },
    } as unknown as EffectContext;

    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!.resolve(ctx);

    expect(recoverToSecurity).not.toHaveBeenCalled();
  });
});

describe("BT26-025 public engine behavior", () => {
  it("plays for 3, places the actual top security face down at Tamer stack bottom, then recovers face down", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "liollmon" }],
          battleArea: [{ card: "BT25-088", as: "tamer", under: [{ card: "BT1-014", as: "existingUnderTamer" }] }],
          security: [{ card: "BT1-009", as: "securityCost" }],
          deck: [{ card: "BT1-013", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.length === 2 && s.state.players[0]!.security.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").stack.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [s.inst("securityCost").instanceId, false],
      [s.inst("existingUnderTamer").instanceId, true],
    ]);
    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [s.inst("recovery").instanceId, false],
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("fires When Moving for itself with the same cost/recovery sequence", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: CARD_ID, as: "mover" },
          battleArea: [{ card: "BT25-088", as: "tamer" }],
          security: [{ card: "BT1-009", as: "securityCost" }],
          deck: [{ card: "BT1-013", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").stack.length === 1 && s.state.players[0]!.security.length === 1);

    expect(s.perm("tamer").stack[0]).toMatchObject({ instanceId: s.inst("securityCost").instanceId, faceUp: false });
    expect(s.state.players[0]!.security[0]).toMatchObject({
      instanceId: s.inst("recovery").instanceId,
      faceUp: false,
    });
  });

  it("inherits Q6986 recovery at 0 security and consumes its once-per-turn use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
          deck: [
            { card: "BT1-013", as: "firstRecovery" },
            { card: "BT1-014", as: "wouldRecoverSecond" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    const host = s.perm("host");

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, host, {
      attackerPermanentId: host.permanentId,
    });
    await settle(() => s.state.players[0]!.security.length === 1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, host, {
      attackerPermanentId: host.permanentId,
    });
    await settle();

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("firstRecovery").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("wouldRecoverSecond").instanceId]);
  });

  it("uses the Lv.2 Glowing Dawn alternate evolution for cost 0 and rejects a trait near-miss", async () => {
    const valid = setupEngine({
      0: {
        breeding: { card: "BT26-003", as: "glowingEgg" },
        hand: [{ card: CARD_ID, as: "liollmon" }],
      },
    });
    valid.state.memory = 0;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("glowingEgg").permanentId,
        instanceId: valid.inst("liollmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("glowingEgg").topCard.cardId === CARD_ID);
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("glowingEgg").stack.map((card) => card.cardId)).toEqual(["BT26-003"]);

    const invalid = setupEngine({
      0: {
        breeding: { card: "BT1-002", as: "plainEgg" },
        hand: [{ card: CARD_ID, as: "liollmon" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainEgg").permanentId,
        instanceId: invalid.inst("liollmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.players[0]!.hand.map((card) => card.cardId)).toContain(CARD_ID);
  });
});
