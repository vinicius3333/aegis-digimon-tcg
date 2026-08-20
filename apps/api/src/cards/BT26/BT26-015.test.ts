import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor, type CardDefinition, type Permanent } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import module from "./BT26-015.js";
import "../index.js";

const definition = (overrides: Partial<CardDefinition>): CardDefinition =>
  ({
    cardId: "TEST-001",
    set: "TEST",
    nameEn: "Test",
    kinds: [],
    colors: [],
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...overrides,
  }) as CardDefinition;

describe("BT26-015 Butenmon", () => {
  it("uses the exact off-color Lv.4 [TS] cost-3 evolution path and rejects a near-match", () => {
    expect(digivolutionRequirementsFor("BT26-015")).toContainEqual({
      level: 4,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });

    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-022", as: "tsBase" }],
        hand: [{ card: "BT26-015", as: "butenmon" }],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("butenmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "nearMatch" }],
        hand: [{ card: "BT26-015", as: "butenmon" }],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("nearMatch").permanentId,
        instanceId: illegal.inst("butenmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("debuffs first, then may pay exactly 1 own-trash card to delete the newly eligible 5000-DP Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-015", as: "butenmon" }],
          trash: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT12-065", as: "sixThousand" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sixThousand").permanentId, s.inst("cost").instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("butenmon"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT12-065")).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("cost").instanceId);
    expect(s.state.players[0]!.deck.at(-1)?.faceUp).toBe(false);
  });

  it("keeps the mandatory debuff when the optional return cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-015", as: "butenmon" }],
          trash: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT24-023", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("butenmon"));

    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("recognizes Chronomon in the host's inherited text for its inherited effect (Q6970)", async () => {
    const host: Permanent = {
      permanentId: "host",
      controllerSeat: 0,
      inBreeding: false,
      isSuspended: true,
      topCard: { instanceId: "host-card", cardId: "HOST" },
      stack: [],
      currentDP: 6000,
      baseDP: 6000,
      dpModifiers: [],
      attachedOptionInstanceIds: [],
      keywords: new Set(),
    } as unknown as Permanent;
    const source = {
      ownerSeat: 0,
      permanent: () => host,
      isOnBattleArea: () => true,
    } as unknown as CardSource;
    let subscription: { matches?: (ctx: EffectContext) => boolean } | undefined;
    const ctx = {
      source,
      game: {
        permanentById: (id: string) => (id === "host" ? host : undefined),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "HOST"
            ? definition({ cardId: "HOST", inheritedEffectText: "[When Attacking] [Chronomon]" })
            : definition({ cardId: card.cardId }),
      },
      fx: {
        subscribeSubTrigger: (value: { matches?: (ctx: EffectContext) => boolean }) => {
          subscription = value;
        },
      },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.None, source).find((candidate) => candidate.isInherited)!;
    await effect.resolve(ctx);

    expect(subscription?.matches).toBeDefined();
    expect(
      subscription!.matches!({
        source,
        trigger: { effectAddedToDeckSeat: 1, effectAddedToDeckBySeat: 0 },
        game: ctx.game,
      } as unknown as EffectContext),
    ).toBe(true);
  });

  it("matches effects controlled by its owner even when they add to the opponent's deck (Q6975)", async () => {
    const host = {
      permanentId: "butenmon",
      controllerSeat: 0,
      inBreeding: false,
      topCard: { instanceId: "butenmon-card", cardId: "BT26-015" },
    } as unknown as Permanent;
    const source = {
      ownerSeat: 0,
      permanent: () => host,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as unknown as CardSource;
    let matches: ((ctx: EffectContext) => boolean) | undefined;
    const ctx = {
      source,
      fx: {
        subscribeSubTrigger: (sub: { matches?: (ctx: EffectContext) => boolean }) => {
          matches = sub.matches;
        },
      },
    } as unknown as EffectContext;

    const mainWatcher = module.effectsForTiming(EffectTiming.None, source).find((effect) => !effect.isInherited)!;
    await mainWatcher.resolve(ctx);

    expect(
      matches!({ source, trigger: { effectAddedToDeckSeat: 1, effectAddedToDeckBySeat: 0 } } as EffectContext),
    ).toBe(true);
    expect(
      matches!({ source, trigger: { effectAddedToDeckSeat: 0, effectAddedToDeckBySeat: 1 } } as EffectContext),
    ).toBe(false);
  });

  it("buffs the chosen Digimon, makes it attack, and spends the watcher only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-015", as: "butenmon" },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("attacker").permanentId);
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenEffectAddsToDeck", {
      effectAddedToDeckSeat: 1,
      effectAddedToDeckBySeat: 0,
    });

    expect(s.perm("attacker").currentDP).toBe(6000);
    expect(s.perm("attacker").isSuspended).toBe(true);

    await advance(s.engine).fireSubTrigger("whenEffectAddsToDeck", {
      effectAddedToDeckSeat: 0,
      effectAddedToDeckBySeat: 0,
    });
    expect(s.perm("attacker").currentDP).toBe(6000);
  });
});
