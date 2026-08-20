import { CardColor, CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-067";

function definition(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: overrides.cardId ?? "FIXTURE",
    set: overrides.set ?? "TEST",
    nameEn: overrides.nameEn ?? "Fixture",
    colors: overrides.colors ?? ([CardColor.Purple] as CardDefinition["colors"]),
    kinds: overrides.kinds ?? [CardKind.Digimon],
    playCost: overrides.playCost ?? 4,
    dp: overrides.dp ?? 4000,
    evoCosts: overrides.evoCosts ?? [],
    maxCountInDeck: overrides.maxCountInDeck ?? 4,
    types: overrides.types ?? [],
    ...overrides,
  };
}

function source(): CardSource {
  return {
    instanceId: "wizardmon-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "wizardmon" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-067 Wizardmon", () => {
  it("legally digivolves from a non-purple/red level 3 TS Digimon for cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-019", as: "kamemon" }],
          hand: [
            { card: CARD_ID, as: "wizardmon" },
            { card: "AD1-001", as: "discard" },
          ],
          deck: [{ card: "AD1-002", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    const discardId = s.inst("discard").instanceId;
    const drawnId = s.inst("drawn").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kamemon").permanentId,
        instanceId: s.inst("wizardmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("kamemon").topCard.instanceId === s.inst("wizardmon").instanceId &&
        s.state.players[0]!.trash.some((card) => card.instanceId === discardId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("kamemon").stack.map((card) => card.cardId)).toEqual(["BT24-019"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawnId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([discardId]);
  });

  it("grants Retaliation only while Wizardmon is a digivolution card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-075", as: "host", under: [CARD_ID] },
          { card: CARD_ID, as: "standalone" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Retaliation")).toBe(false);
  });

  it("at end of turn pays the bottom-deck cost, reduces play cost by exactly 4, and plays the red Iliad", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "wizardmon" },
            { card: "BT24-019", as: "blueCondition" },
          ],
          trash: [{ card: "BT24-011", as: "cyclonemon" }],
          deck: [{ card: "AD1-002", as: "existingBottom" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const wizardmonId = s.perm("wizardmon").topCard.instanceId;
    const targetId = s.inst("cyclonemon").instanceId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("wizardmon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(wizardmonId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === wizardmonId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(targetId);
  });

  it("recognizes an effectively granted yellow color for the condition", () => {
    const cardSource = source();
    const colorHolder = {
      permanentId: "color-holder",
      topCard: { instanceId: "holder-card", cardId: "HOLDER" },
      inBreeding: false,
    };
    const target = { instanceId: "target", cardId: "TARGET" };
    const game = {
      player: () => ({ battleArea: [colorHolder], trash: [target] }),
      definitionOf: (card: { cardId: string }) =>
        card.cardId === "TARGET"
          ? definition({ cardId: "TARGET", colors: [CardColor.Red], types: ["Iliad"] })
          : definition({ cardId: "HOLDER", colors: [CardColor.Green] }),
      effectiveKinds: () => [CardKind.Digimon],
      effectiveColors: () => [CardColor.Green, CardColor.Yellow],
    } as unknown as GameAccess;
    const ctx = { source: cardSource, trigger: {}, game, ask: {}, fx: {} } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnEndTurn, cardSource)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
  });

  it("filters a mixed trash pool by Digimon kind, exact Iliad trait, and red/blue color", async () => {
    const cardSource = source();
    const condition = {
      permanentId: "condition",
      topCard: { instanceId: "condition-card", cardId: "CONDITION" },
      inBreeding: false,
    };
    const trash = [
      { instanceId: "eligible-red", cardId: "ELIGIBLE" },
      { instanceId: "wrong-color", cardId: "WRONG-COLOR" },
      { instanceId: "near-trait", cardId: "NEAR-TRAIT" },
      { instanceId: "option", cardId: "OPTION" },
    ];
    const defs: Record<string, CardDefinition> = {
      CONDITION: definition({ cardId: "CONDITION", colors: [CardColor.Blue] }),
      ELIGIBLE: definition({ cardId: "ELIGIBLE", colors: [CardColor.Red], types: ["Iliad"] }),
      "WRONG-COLOR": definition({ cardId: "WRONG-COLOR", colors: [CardColor.Purple], types: ["Iliad"] }),
      "NEAR-TRAIT": definition({ cardId: "NEAR-TRAIT", colors: [CardColor.Blue], types: ["Neo Iliad"] }),
      OPTION: definition({ cardId: "OPTION", colors: [CardColor.Red], kinds: [CardKind.Option], types: ["Iliad"] }),
    };
    const game = {
      player: () => ({ battleArea: [condition], trash }),
      definitionOf: (card: { cardId: string }) => defs[card.cardId]!,
    } as unknown as GameAccess;
    const returnToDeck = vi.fn(async () => [{ instanceId: cardSource.instanceId, cardId: CARD_ID }]);
    const playInstances = vi.fn(async () => []);
    const selectCards = vi.fn(async (_ctx, opts: { candidates: string[] }) => {
      expect(opts.candidates).toEqual(["eligible-red"]);
      return ["eligible-red"];
    });
    const ctx = {
      source: cardSource,
      trigger: {},
      game,
      ask: { selectCards },
      fx: { returnToDeck, playInstances },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnEndTurn, cardSource)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    // A sole eligible target is selected automatically, without opening a redundant decision.
    expect(selectCards).not.toHaveBeenCalled();
    expect(playInstances).toHaveBeenCalledWith(["eligible-red"], { payCost: true, costDelta: 4 });
  });

  it("does not play when bounce prevention stops the self-return cost", async () => {
    const cardSource = source();
    const condition = {
      permanentId: "condition",
      topCard: { instanceId: "condition-card", cardId: "CONDITION" },
      inBreeding: false,
    };
    const target = { instanceId: "target", cardId: "TARGET" };
    const game = {
      player: () => ({ battleArea: [condition], trash: [target] }),
      definitionOf: (card: { cardId: string }) =>
        card.cardId === "TARGET"
          ? definition({ cardId: "TARGET", colors: [CardColor.Blue], types: ["Iliad"] })
          : definition({ cardId: "CONDITION", colors: [CardColor.Yellow] }),
    } as unknown as GameAccess;
    const returnToDeck = vi.fn(async () => []);
    const playInstances = vi.fn(async () => []);
    const ctx = {
      source: cardSource,
      trigger: {},
      game,
      ask: {},
      fx: { returnToDeck, playInstances },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnEndTurn, cardSource)[0]!;

    await effect.resolve(ctx);

    expect(returnToDeck).toHaveBeenCalledWith([cardSource.instanceId], { toTop: false });
    expect(playInstances).not.toHaveBeenCalled();
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "draws before mandatorily trashing exactly one card at %s",
    async (timing) => {
      const cardSource = source();
      const hand = [{ instanceId: "kept", cardId: "KEEP" }];
      const draw = vi.fn(async () => {
        hand.push({ instanceId: "drawn", cardId: "DRAWN" });
        return [hand[1]];
      });
      const trash = vi.fn(async () => []);
      const selectCards = vi.fn(async (_ctx, opts: { candidates: string[]; min: number; max: number }) => {
        expect(opts).toEqual({ candidates: ["kept", "drawn"], min: 1, max: 1 });
        return ["drawn"];
      });
      const ctx = {
        source: cardSource,
        trigger: {},
        game: { player: () => ({ hand }) },
        ask: { selectCards },
        fx: { draw, trash },
      } as unknown as EffectContext;
      const effect = getEffectModule(CARD_ID)!.effectsForTiming(timing, cardSource)[0]!;

      expect(effect.optional).toBe(false);
      await effect.resolve(ctx);

      expect(draw).toHaveBeenCalledWith(0, 1);
      expect(trash).toHaveBeenCalledWith(["drawn"], { byEffectSeat: 0 });
    },
  );
});
