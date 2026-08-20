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
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import module from "./BT26-042.js";
import "../index.js";

const CARD_ID = "BT26-042";

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

function card(instanceId: string, cardId: string): CardInstance {
  return { instanceId, cardId, ownerSeat: 0 as Seat, faceUp: true } as CardInstance;
}

function source(permanent?: Permanent): CardSource {
  return {
    instanceId: "okuwamon-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID, types: ["Insectoid", "Titan", "TS"] }),
    permanent: () => permanent,
    isOnBattleArea: () => permanent !== undefined,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-042 Okuwamon", () => {
  it("uses exactly the Lv.4 [TS] alternate evolution for cost 3 and rejects a non-TS Lv.4", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 4,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-010", as: "tsBase" }],
        hand: [{ card: CARD_ID, as: "okuwamon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("okuwamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "AD1-001", as: "nonTsLv4" }],
        hand: [{ card: CARD_ID, as: "okuwamon" }],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("nonTsLv4").permanentId,
        instanceId: illegal.inst("okuwamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("resolves its two simultaneous On Play effects and grants the full long-duration buff", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-066", as: "insectoid" }],
          hand: [{ card: CARD_ID, as: "okuwamon" }],
        },
        1: { battleArea: [{ card: "BT1-085", as: "opponentTamer" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("insectoid").permanentId);
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("okuwamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasPierce(s.perm("insectoid")));
    await settle();

    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "unsuspend")).toBe(true);
    expect(s.perm("insectoid").currentDP).toBe(5000);
    expect(observe(s.engine).hasPierce(s.perm("insectoid"))).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("offers the controller both simultaneous On Play triggers for ordering (Q7033)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "okuwamon" }] },
        1: { battleArea: [{ card: "BT1-085", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: false },
    );
    const resolving = advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("okuwamon"), {
      subjectPermanentId: s.perm("okuwamon").permanentId,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys.some((key) => key.endsWith(`${CARD_ID}/on-play-suspend-lock`))).toBe(true);
    expect(keys.some((key) => key.endsWith(`${CARD_ID}/piercing-dp-grant`))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[1]!] },
      }),
    ).toEqual({ ok: true });
    await resolving;
  });

  it("chooses the suspend and unsuspend-lock targets independently, including an unsuspended card (Q7031)", async () => {
    const suspendTarget = {
      permanentId: "suspend",
      topCard: card("suspend-card", "DIGI"),
      inBreeding: false,
    } as Permanent;
    const lockTarget = { permanentId: "lock", topCard: card("lock-card", "TAMER"), inBreeding: false } as Permanent;
    const host = { permanentId: "host", topCard: card("host-card", CARD_ID), inBreeding: false } as Permanent;
    const game = {
      player: (seat: Seat) => ({ battleArea: seat === 0 ? [host] : [suspendTarget, lockTarget] }),
      opponentOf: () => 1 as Seat,
      definitionOf: (instance: CardInstance) =>
        definition({ kinds: instance.cardId === "TAMER" ? [CardKind.Tamer] : [CardKind.Digimon] }),
    } as unknown as GameAccess;
    const chooseTargets = vi
      .fn<(...args: any[]) => any>()
      .mockResolvedValueOnce([suspendTarget.permanentId])
      .mockResolvedValueOnce([lockTarget.permanentId]);
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
    expect(restrict).toHaveBeenCalledWith(lockTarget.permanentId, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
  });

  it("targets exact Insectoid/Titan Digimon only, excluding near traits, Tamers, opponents, and breeding", async () => {
    const make = (id: string, cardId: string, inBreeding = false): Permanent =>
      ({ permanentId: id, topCard: card(`${id}-card`, cardId), inBreeding }) as Permanent;
    const host = make("host", CARD_ID);
    const insectoid = make("insectoid", "INSECTOID");
    const titan = make("titan", "TITAN");
    const near = make("near", "NEAR");
    const tamer = make("tamer", "TAMER");
    const breeding = make("breeding", "INSECTOID", true);
    const opponent = make("opponent", "TITAN");
    const definitions: Record<string, CardDefinition> = {
      [CARD_ID]: definition({ types: ["Insectoid", "Titan", "TS"] }),
      INSECTOID: definition({ types: ["Insectoid"] }),
      TITAN: definition({ types: ["Titan"] }),
      NEAR: definition({ types: ["Ancient Insect"] }),
      TAMER: definition({ kinds: [CardKind.Tamer], types: ["Titan"] }),
    };
    const game = {
      player: (seat: Seat) => ({
        battleArea: seat === 0 ? [host, insectoid, titan, near, tamer, breeding] : [opponent],
      }),
      definitionOf: (instance: CardInstance) => definitions[instance.cardId]!,
    } as unknown as GameAccess;
    const chooseTargets = vi.fn(async (_ctx, opts: { candidates: string[] }) => {
      expect(new Set(opts.candidates)).toEqual(new Set([host.permanentId, insectoid.permanentId, titan.permanentId]));
      return [titan.permanentId];
    });
    const grantPierce = vi.fn();
    const modifyDP = vi.fn();
    const cardSource = source(host);
    const ctx = {
      source: cardSource,
      game,
      ask: { chooseTargets },
      fx: { grantPierce, modifyDP } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.OnAllyAttack, cardSource)[0]!;

    await effect.resolve(ctx);
    expect(grantPierce).toHaveBeenCalledWith(titan.permanentId, EffectDuration.UntilOpponentTurnEnd);
    expect(modifyDP).toHaveBeenCalledWith(titan.permanentId, 3000, EffectDuration.UntilOpponentTurnEnd);
  });

  it("shares the buff OPT between On Play and its own attack while keeping copies independent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "first" },
            { card: CARD_ID, as: "second" },
            { card: "BT1-066", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("first"), {
      subjectPermanentId: s.perm("first").permanentId,
    });
    expect(s.perm("target").currentDP).toBe(5000);

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("first"), {
      attackerPermanentId: s.perm("first").permanentId,
    });
    expect(s.perm("target").currentDP).toBe(5000);

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("second"), {
      subjectPermanentId: s.perm("second").permanentId,
    });
    expect(s.perm("target").currentDP).toBe(8000);
  });

  it("trashes the top security only for a surviving battle winner carrying Okuwamon as inherited (Q7032)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-081", under: [{ card: CARD_ID, as: "inherited" }], as: "host" }],
      },
      1: { security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-009"] },
    });
    const topId = s.inst("topSecurity").instanceId;
    await advance(s.engine).fireForPermanent(EffectTiming.OnBattleDeleteOpponent, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
      deletedPermanentId: "deleted-opponent",
    });
    await settle();

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((instance) => instance.instanceId === topId)).toBe(true);

    const effect = module.effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source(undefined))[0]!;
    expect(
      effect.canTrigger({
        source: source(undefined),
        trigger: { attackerPermanentId: "former-host" },
      } as EffectContext),
    ).toBe(false);
  });
});
