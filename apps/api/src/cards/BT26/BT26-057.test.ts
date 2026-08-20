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
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const CARD_ID = "BT26-057";

function definition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: overrides.cardId ?? "TEST",
    set: overrides.set ?? "TEST",
    nameEn: overrides.nameEn ?? "Fixture",
    colors: overrides.colors ?? [CardColor.Black],
    kinds: overrides.kinds ?? [CardKind.Digimon],
    playCost: overrides.playCost ?? 0,
    dp: overrides.dp ?? 0,
    evoCosts: overrides.evoCosts ?? [],
    maxCountInDeck: overrides.maxCountInDeck ?? 4,
    types: overrides.types ?? [],
    ...overrides,
  };
}

function instance(instanceId: string, cardId: string, ownerSeat = 0 as Seat): CardInstance {
  return { instanceId, cardId, ownerSeat, faceUp: true } as CardInstance;
}

function source(permanent?: Permanent): CardSource {
  return {
    instanceId: "bearcatmon-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({
      cardId: CARD_ID,
      kinds: [CardKind.Digimon, CardKind.Option],
      types: ["Beastkin", "Glowing Dawn", "BEATBREAK"],
    }),
    permanent: () => permanent,
    isOnBattleArea: () => permanent !== undefined,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-057 Bearcatmon // Penetrate Blow", () => {
  it("uses the exact Lv.4 [Glowing Dawn] cost-3 evolution path and rejects a near-match", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 4,
      traits: ["Glowing Dawn"],
      cost: 3,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "ST23-03", as: "cougarmon" }],
        hand: [{ card: CARD_ID, as: "bearcatmon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("cougarmon").permanentId,
        instanceId: legal.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("cougarmon").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-051", as: "plainYellowLv4" }],
        hand: [{ card: CARD_ID, as: "bearcatmon" }],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainYellowLv4").permanentId,
        instanceId: illegal.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("uses Penetrate Blow through its Glowing Dawn requirement without a black color source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "option" }],
          battleArea: [{ card: "ST23-03", as: "yellowGlowingDawn" }],
        },
        1: {
          battleArea: [{ card: "BT26-014", under: ["BT1-009"], as: "target" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.perm("target").stack).toHaveLength(0);

    const rejected = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "option" }] } });
    rejected.state.memory = 4;
    await rejected.ready();
    expect(
      rejected.engine.applyIntent(0, {
        type: "playCard",
        instanceId: rejected.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("honors a runtime-granted Glowing Dawn trait for Use Req. and rejects a near-match grant", async () => {
    const granted = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        battleArea: [{ card: "BT1-051", as: "plainYellow" }],
      },
      1: { battleArea: [{ card: "BT26-014", as: "target", under: ["BT1-009"] }] },
    });
    granted.state.memory = 4;
    await granted.ready();
    advance(granted.engine).ledgers.continuous.addNameTraitGrant(
      granted.perm("plainYellow").permanentId,
      "trait",
      ["Glowing Dawn"],
      EffectDuration.UntilEachTurnEnd,
    );
    await advance(granted.engine).recompute();

    expect(
      granted.engine.applyIntent(0, {
        type: "playCard",
        instanceId: granted.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      granted.state.players[0]!.trash.some((card) => card.instanceId === granted.inst("option").instanceId),
    );

    const nearMatch = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "option" }],
        battleArea: [{ card: "BT1-051", as: "plainYellow" }],
      },
    });
    nearMatch.state.memory = 4;
    await nearMatch.ready();
    advance(nearMatch.engine).ledgers.continuous.addNameTraitGrant(
      nearMatch.perm("plainYellow").permanentId,
      "trait",
      ["Glowing Dusk"],
      EffectDuration.UntilEachTurnEnd,
    );
    await advance(nearMatch.engine).recompute();

    expect(
      nearMatch.engine.applyIntent(0, {
        type: "playCard",
        instanceId: nearMatch.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("publicly pays the exact bottom face-down Tamer card and gains scoped immunity plus 3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST23-03", as: "cougarmon" },
            {
              card: "BT1-085",
              as: "tamer",
              under: [
                { card: "BT1-009", as: "bottomCost", faceUp: false },
                { card: "BT1-009", as: "upperCard", faceUp: true },
              ],
            },
          ],
          hand: [{ card: CARD_ID, as: "bearcatmon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cougarmon").permanentId,
        instanceId: s.inst("bearcatmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("bottomCost").instanceId) &&
        observe(s.engine).hasRestriction(s.perm("cougarmon"), "beAffected", "Digimon"),
    );

    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("upperCard").instanceId]);
    expect(observe(s.engine).hasRestriction(s.perm("cougarmon"), "beAffected", "Digimon")).toBe(true);
  });

  it("does not grant immunity or DP when the Tamer-under-card trash is prevented", async () => {
    const bottom = instance("bottom", "BOTTOM");
    bottom.faceUp = false;
    const tamer = {
      permanentId: "tamer",
      controllerSeat: 0 as Seat,
      topCard: instance("tamer-top", "TAMER"),
      stack: [bottom],
      inBreeding: false,
    } as unknown as Permanent;
    const host = {
      permanentId: "host",
      controllerSeat: 0 as Seat,
      topCard: instance("host-top", CARD_ID),
    } as unknown as Permanent;
    const cardSource = source(host);
    const game = {
      player: () => ({ battleArea: [host, tamer] }),
      permanentById: (id: string) => (id === tamer.permanentId ? tamer : host),
      definitionOf: (card: CardInstance) =>
        definition({ cardId: card.cardId, kinds: card.cardId === "TAMER" ? [CardKind.Tamer] : [CardKind.Digimon] }),
    } as unknown as GameAccess;
    const restrict = vi.fn();
    const modifyDP = vi.fn();
    const ctx = {
      source: cardSource,
      game,
      ask: { optional: vi.fn(async () => true) },
      fx: {
        trashDigivolutionCards: vi.fn(async () => []),
        restrict,
        modifyDP,
      } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!;

    await effect.resolve(ctx);
    expect(ctx.fx.trashDigivolutionCards).toHaveBeenCalledWith("tamer", ["bottom"], { byEffectSeat: 0 });
    expect(restrict).not.toHaveBeenCalled();
    expect(modifyDP).not.toHaveBeenCalled();
  });

  it("shares one once-per-turn budget across both unsuspend triggers for each physical copy", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "bearcatA", suspended: true },
            { card: CARD_ID, as: "bearcatB", suspended: true },
            { card: "BT1-085", as: "controlledTamer" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched");
    expect(s.perm("bearcatA").isSuspended).toBe(false);
    expect(s.perm("bearcatB").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("bearcatA").permanentId, s.perm("bearcatB").permanentId]);
    await advance(s.engine).fireSubTrigger("whenDigivolutionTrashed", {
      subjectPermanentId: s.perm("controlledTamer").permanentId,
    });
    expect(s.perm("bearcatA").isSuspended).toBe(true);
    expect(s.perm("bearcatB").isSuspended).toBe(true);
  });

  it("releases the once-per-turn reservation when the optional unsuspend is declined", async () => {
    const host = {
      permanentId: "host",
      controllerSeat: 0 as Seat,
      topCard: instance("bearcatmon-card", CARD_ID),
      isSuspended: true,
      inBreeding: false,
    } as unknown as Permanent;
    const cardSource = source(host);
    const subscriptions: SubTriggerInstall[] = [];
    const ctx = {
      source: cardSource,
      game: { permanentById: () => host } as unknown as GameAccess,
      fx: {
        subscribeSubTrigger: vi.fn((install: SubTriggerInstall) => {
          subscriptions.push(install);
          return String(subscriptions.length);
        }),
      } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.None, cardSource)[0]!;
    await effect.resolve(ctx);

    expect(subscriptions).toHaveLength(2);
    expect(new Set(subscriptions.map(({ oncePerTurnKey }) => oncePerTurnKey))).toEqual(
      new Set([`${cardSource.instanceId}/${CARD_ID}/attack-switch-or-tamer-trash-may-unsuspend`]),
    );
    const subCtx = {
      source: cardSource,
      game: ctx.game,
      ask: { optional: vi.fn(async () => false) },
      fx: { unsuspend: vi.fn(async () => undefined) } as unknown as Primitives,
    } as unknown as EffectContext;
    await subscriptions[0]!.run(subCtx);
    expect(subCtx.oncePerTurnActivationDeclined).toBe(true);
    expect(subCtx.fx.unsuspend).not.toHaveBeenCalled();
  });

  it("the Option independently de-digivolves, grants the second target, expires correctly, and obeys Q7060-Q7066", async () => {
    const targetA = {
      permanentId: "target-a",
      controllerSeat: 1 as Seat,
      topCard: instance("target-a-top", "TARGET-A", 1 as Seat),
      stack: [instance("target-a-under", "UNDER-A", 1 as Seat)],
      inBreeding: false,
    } as unknown as Permanent;
    const targetB = {
      permanentId: "target-b",
      controllerSeat: 1 as Seat,
      topCard: instance("target-b-top", "TARGET-B", 1 as Seat),
      stack: [],
      inBreeding: false,
    } as unknown as Permanent;
    const players = [{ battleArea: [] }, { battleArea: [targetA, targetB] }];
    const game = {
      player: (seat: Seat) => players[seat],
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [targetA, targetB].find(({ permanentId }) => permanentId === id),
      definitionOf: (card: CardInstance) => definition({ cardId: card.cardId }),
    } as unknown as GameAccess;
    const choices = [[targetA.permanentId], [targetB.permanentId]];
    const deDigivolve = vi.fn(async () => 1);
    let subscription: SubTriggerInstall | undefined;
    const ctx = {
      source: source(),
      game,
      ask: { chooseTargets: vi.fn(async () => choices.shift() ?? []) },
      fx: {
        deDigivolve,
        subscribeSubTrigger: vi.fn((install: SubTriggerInstall) => {
          subscription = install;
          return "grant";
        }),
      } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnUseOption, ctx.source)[0]!;

    await effect.resolve(ctx);
    expect(deDigivolve).toHaveBeenCalledWith(targetA.permanentId, 1, { byEffectSeat: 0 });
    expect(subscription).toMatchObject({
      event: "startOfYourMainPhase",
      sourcePermanentId: targetB.permanentId,
      expiresOnTurnEndOf: 1,
    });

    const forceAttack = vi.fn(async () => undefined);
    const triggerCtx = {
      source: { ...source(targetB), ownerSeat: 1 as Seat, isOwnersTurn: () => true },
      fx: {
        forceAttack,
        isUnaffectableByOpponentEffects: vi.fn(() => false),
        isBeAffectedBySourceKind: vi.fn(() => false),
      } as unknown as Primitives,
    } as unknown as EffectContext;
    expect(subscription!.matches!(triggerCtx)).toBe(true);
    await subscription!.run(triggerCtx);
    expect(forceAttack).toHaveBeenCalledWith(targetB.permanentId);

    triggerCtx.fx.isUnaffectableByOpponentEffects = vi.fn(() => true);
    expect(subscription!.matches!(triggerCtx)).toBe(false);
    triggerCtx.fx.isUnaffectableByOpponentEffects = vi.fn(() => false);
    triggerCtx.fx.isBeAffectedBySourceKind = vi.fn((_id: string, kind: string) => kind === "Option");
    expect(subscription!.matches!(triggerCtx)).toBe(false);
  });

  it("records the exact opponent-only Digimon immunity scope and duration", async () => {
    const host = {
      permanentId: "host",
      controllerSeat: 0 as Seat,
      topCard: instance("host-top", CARD_ID),
    } as unknown as Permanent;
    const tamer = {
      permanentId: "tamer",
      controllerSeat: 0 as Seat,
      topCard: instance("tamer-top", "TAMER"),
      stack: [{ ...instance("cost", "COST"), faceUp: false }],
      inBreeding: false,
    } as unknown as Permanent;
    const cardSource = source(host);
    const restrict = vi.fn();
    const modifyDP = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        player: () => ({ battleArea: [host, tamer] }),
        permanentById: (id: string) => (id === "tamer" ? tamer : host),
        definitionOf: (card: CardInstance) =>
          definition({ cardId: card.cardId, kinds: card.cardId === "TAMER" ? [CardKind.Tamer] : [CardKind.Digimon] }),
      } as unknown as GameAccess,
      ask: { optional: vi.fn(async () => true) },
      fx: {
        trashDigivolutionCards: vi.fn(async () => [tamer.stack[0]!]),
        restrict,
        modifyDP,
      } as unknown as Primitives,
    } as unknown as EffectContext;

    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.WhenDigivolving, cardSource)[0]!.resolve(ctx);
    expect(restrict).toHaveBeenCalledWith(host.permanentId, "beAffected", EffectDuration.UntilOpponentTurnEnd, {
      fromSourceKind: ["Digimon"],
      byOpponentEffectsOnly: true,
    });
    expect(modifyDP).toHaveBeenCalledWith(host.permanentId, 3000, EffectDuration.UntilOpponentTurnEnd);
  });
});
