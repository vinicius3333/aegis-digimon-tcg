import {
  CardColor,
  CardKind,
  EffectDuration,
  EffectTiming,
  digivolutionRequirementsFor,
  type CardDefinition,
  type CardInstance,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-046.js";
import "../index.js";

const CARD_ID = "BT26-046";

function definition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: overrides.cardId ?? "TEST",
    set: overrides.set ?? "TEST",
    nameEn: overrides.nameEn ?? "Fixture",
    colors: overrides.colors ?? [CardColor.Green],
    kinds: overrides.kinds ?? [CardKind.Digimon],
    playCost: overrides.playCost ?? 0,
    dp: overrides.dp ?? 1000,
    evoCosts: overrides.evoCosts ?? [],
    maxCountInDeck: overrides.maxCountInDeck ?? 4,
    types: overrides.types ?? [],
    ...overrides,
  };
}

function source(permanent?: Permanent): CardSource {
  return {
    instanceId: "gryphonmon-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID, level: 6, types: ["Mythical Beast", "Iliad", "TS"] }),
    permanent: () => permanent,
    isOnBattleArea: () => permanent !== undefined,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-046 Gryphonmon", () => {
  it("uses exactly the Lv.5 [TS] alternate evolution for cost 3 and rejects a non-TS Lv.5", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 5,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });

    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-042", as: "tsBase" }],
        hand: [{ card: CARD_ID, as: "gryphonmon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("gryphonmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT25-041", as: "plainLv5" }],
        hand: [{ card: CARD_ID, as: "gryphonmon" }],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainLv5").permanentId,
        instanceId: illegal.inst("gryphonmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("reduces its play cost by 4 only with at least two suspended battle-area Digimon", async () => {
    const reduced = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gryphonmon" }],
          battleArea: [{ card: "BT1-009", as: "mine", suspended: true }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "theirs", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    reduced.state.memory = 7;
    await reduced.ready();
    expect(
      reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("gryphonmon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => reduced.state.players[0]!.battleArea.some((p) => p.topCard.cardId === CARD_ID));
    await settle();
    expect(reduced.state.memory).toBe(0);

    const unreduced = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gryphonmon" }],
          battleArea: [{ card: "BT1-009", as: "one", suspended: true }],
        },
        1: { battleArea: [{ card: "BT1-085", as: "suspendedTamer", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    unreduced.state.memory = 7;
    await unreduced.ready();
    expect(
      unreduced.engine.applyIntent(0, { type: "playCard", instanceId: unreduced.inst("gryphonmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => unreduced.state.players[0]!.battleArea.some((p) => p.topCard.cardId === CARD_ID));
    await settle();
    expect(unreduced.state.memory).toBe(-4);
  });

  it("on digivolution independently suspends, locks an already-unsuspended target (Q7039), and protects an ally", async () => {
    const suspendTarget = { permanentId: "suspend-target", inBreeding: false } as Permanent;
    const lockTarget = { permanentId: "lock-target", inBreeding: false } as Permanent;
    const host = { permanentId: "host", inBreeding: false } as Permanent;
    const ally = { permanentId: "ally", inBreeding: false } as Permanent;
    for (const [permanent, cardId] of [
      [suspendTarget, "OPPONENT-DIGIMON"],
      [lockTarget, "OPPONENT-TAMER"],
      [host, CARD_ID],
      [ally, "ALLY"],
    ] as const) {
      permanent.topCard = {
        instanceId: `${cardId}-instance`,
        cardId,
        ownerSeat: 0 as Seat,
      } as unknown as CardInstance;
    }
    const game = {
      player: (seat: Seat) => ({ battleArea: seat === 0 ? [host, ally] : [suspendTarget, lockTarget] }),
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) =>
        definition({ kinds: card.cardId === "OPPONENT-TAMER" ? [CardKind.Tamer] : [CardKind.Digimon] }),
    } as unknown as GameAccess;
    const chooseTargets = vi
      .fn<(...args: any[]) => any>()
      .mockResolvedValueOnce([suspendTarget.permanentId])
      .mockResolvedValueOnce([lockTarget.permanentId])
      .mockResolvedValueOnce([ally.permanentId]);
    const suspend = vi.fn(async () => [suspendTarget.permanentId]);
    const restrict = vi.fn();
    const cardSource = source(host);
    const ctx = {
      source: cardSource,
      game,
      ask: { chooseTargets },
      fx: { suspend, restrict } as unknown as Primitives,
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!.resolve(ctx);

    expect(suspend).toHaveBeenCalledWith([suspendTarget.permanentId]);
    expect(restrict).toHaveBeenNthCalledWith(
      1,
      lockTarget.permanentId,
      "unsuspend",
      EffectDuration.UntilOpponentTurnEnd,
    );
    expect(restrict).toHaveBeenNthCalledWith(
      2,
      ally.permanentId,
      "beDeletedInBattle",
      EffectDuration.UntilOpponentTurnEnd,
    );
  });

  it("continues to the protection after an empty opponent pool and excludes Tamers and breeding Digimon", async () => {
    const host = {
      permanentId: "host",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "host-card", cardId: CARD_ID, ownerSeat: 0 as Seat },
      inBreeding: false,
    } as Permanent;
    const ally = {
      permanentId: "ally",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "ally-card", cardId: "ALLY", ownerSeat: 0 as Seat },
      inBreeding: false,
    } as Permanent;
    const tamer = {
      permanentId: "tamer",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "tamer-card", cardId: "TAMER", ownerSeat: 0 as Seat },
      inBreeding: false,
    } as Permanent;
    const breeding = {
      permanentId: "breeding",
      controllerSeat: 0 as Seat,
      topCard: { instanceId: "egg-card", cardId: "ALLY", ownerSeat: 0 as Seat },
      inBreeding: true,
    } as Permanent;
    const game = {
      player: (seat: Seat) => ({ battleArea: seat === 0 ? [host, ally, tamer, breeding] : [] }),
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) =>
        definition({ kinds: card.cardId === "TAMER" ? [CardKind.Tamer] : [CardKind.Digimon] }),
    } as unknown as GameAccess;
    const restrict = vi.fn();
    const ctx = {
      source: source(host),
      game,
      ask: { chooseTargets: vi.fn(async () => [ally.permanentId]) },
      fx: { suspend: vi.fn(), restrict } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.OnPlay, source(host))[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(ctx.fx.suspend).not.toHaveBeenCalled();
    expect(ctx.ask.chooseTargets).toHaveBeenCalledWith(
      ctx,
      expect.objectContaining({ candidates: [host.permanentId, ally.permanentId] }),
    );
    expect(restrict).toHaveBeenCalledWith(ally.permanentId, "beDeletedInBattle", EffectDuration.UntilOpponentTurnEnd);
  });

  it("exposes innate Piercing at the security-check window and keeps the other clauses non-OPT", async () => {
    const permanent = { permanentId: "gryphonmon" } as Permanent;
    const cardSource = source(permanent);
    const grantPierce = vi.fn();
    const effect = module.effectsForTiming(EffectTiming.OnDetermineDoSecurityCheck, cardSource)[0]!;
    await effect.resolve({ source: cardSource, fx: { grantPierce } } as unknown as EffectContext);

    expect(grantPierce).toHaveBeenCalledWith(permanent.permanentId, EffectDuration.UntilEndBattle);
    expect(effect.maxPerTurn).toBe(-1);
    expect(module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.maxPerTurn).toBe(-1);
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!.maxPerTurn).toBe(-1);
  });
});
