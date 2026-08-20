import { CardColor, CardKind, EffectDuration, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT26-056";

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
    instanceId: "cerberus-card",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: definition({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "cerberus" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-056 Cerberusmon: Werewolf Mode // Inferno Divide", () => {
  it.each([
    ["BT26-074", 1, "the exact Cerberusmon name"],
    ["BT25-011", 3, "a non-black/purple level 4 TS Digimon"],
  ])("digivolves from %s for cost %i through %s", async (baseCard, cost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: CARD_ID, as: "werewolf" }],
        deck: ["AD1-001"],
      },
    });
    s.state.memory = cost;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("werewolf").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("werewolf").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe(baseCard);
  });

  it("exposes all printed keywords and the rules-text Dark Animal trait", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "werewolf" }] } });
    await s.ready();

    for (const keyword of ["Jamming", "Reboot", "Blocker"]) {
      expect(observe(s.engine).hasKeyword(s.perm("werewolf"), keyword)).toBe(true);
    }
    expect(observe(s.engine).hasEffectiveTrait(s.perm("werewolf"), "Dark Animal")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("werewolf"), "Dark Animals")).toBe(false);
  });

  it("uses the Option side through a runtime-granted TS trait with no black source or hand card (Q7059)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "infernoDivide" }],
          battleArea: [{ card: "BT1-051", as: "yellowRuntimeTs" }],
        },
        1: {
          battleArea: [
            {
              card: "BT26-016",
              as: "target",
              under: [
                { card: "AD1-001", as: "bottom" },
                { card: "AD1-002", as: "middle" },
                { card: "AD1-003", as: "upper" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    advance(s.engine).ledgers.continuous.addNameTraitGrant(
      s.perm("yellowRuntimeTs").permanentId,
      "trait",
      ["TS"],
      EffectDuration.UntilEachTurnEnd,
    );
    await advance(s.engine).recompute();
    const optionId = s.inst("infernoDivide").instanceId;
    const bottomId = s.inst("bottom").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: optionId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.instanceId === bottomId);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([optionId]);
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("trashes exactly one existing hand card before de-digivolving", async () => {
    const cardSource = source();
    const discard = { instanceId: "discard", cardId: "DISCARD" };
    const opponent = {
      permanentId: "opponent",
      inBreeding: false,
      topCard: { instanceId: "opponent-top", cardId: "OPPONENT" },
    };
    const game = {
      opponentOf: () => 1 as Seat,
      player: (seat: Seat) => (seat === 0 ? { hand: [discard] } : { battleArea: [opponent] }),
      definitionOf: () => definition(),
    } as unknown as GameAccess;
    const calls: string[] = [];
    const trash = vi.fn(async () => {
      calls.push("trash");
      return [discard];
    });
    const deDigivolve = vi.fn(() => calls.push("deDigivolve"));
    const ctx = {
      source: cardSource,
      trigger: {},
      game,
      ask: {
        selectCards: vi.fn(async (_ctx, opts: { candidates: string[]; min: number; max: number }) => {
          expect(opts).toEqual({ candidates: ["discard"], min: 1, max: 1 });
          return ["discard"];
        }),
        chooseTargets: vi.fn(async () => ["opponent"]),
      },
      fx: { trash, deDigivolve },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnUseOption, cardSource)[0]!;

    await effect.resolve(ctx);

    expect(trash).toHaveBeenCalledWith(["discard"], { byEffectSeat: 0 });
    expect(deDigivolve).toHaveBeenCalledWith("opponent", 3, { byEffectSeat: 0 });
    expect(calls).toEqual(["trash", "deDigivolve"]);
  });

  it("rejects the Option side without either a black source or a TS card", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "infernoDivide" }] } });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("infernoDivide").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("plays an eligible level 4 Titan from trash for free after deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "werewolf" }],
          trash: [{ card: "BT24-013", as: "titan" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.inst("titan").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("werewolf").permanentId])).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("may decline the On Deletion play and leaves the Titan in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "werewolf" }],
          trash: [{ card: "BT24-013", as: "titan" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetId = s.inst("titan").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("werewolf").permanentId]);
    await settle();

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(targetId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === targetId)).toBe(false);
  });

  it("offers only exact level 4-or-lower Titan Digimon after deletion", async () => {
    const cardSource = source();
    const trash = [
      { instanceId: "eligible", cardId: "ELIGIBLE" },
      { instanceId: "level-five", cardId: "LEVEL-FIVE" },
      { instanceId: "near-trait", cardId: "NEAR" },
      { instanceId: "option", cardId: "OPTION" },
    ];
    const defs: Record<string, CardDefinition> = {
      ELIGIBLE: definition({ cardId: "ELIGIBLE", level: 4, types: ["Titan"] }),
      "LEVEL-FIVE": definition({ cardId: "LEVEL-FIVE", level: 5, types: ["Titan"] }),
      NEAR: definition({ cardId: "NEAR", level: 4, types: ["Titanic"] }),
      OPTION: definition({ cardId: "OPTION", level: 4, kinds: [CardKind.Option], types: ["Titan"] }),
    };
    const selectCards = vi.fn(async (_ctx, opts: { candidates: string[]; min: number; max: number }) => {
      expect(opts).toEqual({ candidates: ["eligible"], min: 1, max: 1 });
      return ["eligible"];
    });
    const playInstances = vi.fn(async () => []);
    const ctx = {
      source: cardSource,
      trigger: {},
      game: { player: () => ({ trash }), definitionOf: (card: { cardId: string }) => defs[card.cardId]! },
      ask: { selectCards },
      fx: { playInstances },
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDestroyedAnyone, cardSource)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(selectCards).toHaveBeenCalledOnce();
    expect(playInstances).toHaveBeenCalledWith(["eligible"], { payCost: false });
  });
});
