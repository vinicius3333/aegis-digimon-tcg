import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT26-055.js";
import "../index.js";

const CARD_ID = "BT26-055";

function makeSource(): CardSource {
  const definition: CardDefinition = {
    cardId: CARD_ID,
    set: "BT26",
    nameEn: "Giromon",
    kinds: ["Digimon"] as never,
    colors: ["Black"] as never,
    playCost: 7,
    dp: 7000,
    types: ["Mine", "DM", "Ver.3"],
    evoCosts: [],
    maxCountInDeck: 4,
  };
  return {
    instanceId: "giromon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition,
    permanent: () => ({ permanentId: "giromon-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-055 [Counter] timing", () => {
  it("digivolves from an off-color level 4 [DM] Digimon for alternate cost 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-023", as: "base" }],
          hand: [{ card: CARD_ID, as: "giromon" }],
          deck: ["BT5-022"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("giromon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("giromon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("is exposed through the dedicated Counter window", () => {
    const source = makeSource();
    const module = getEffectModule(CARD_ID);
    expect(module!.effectsForTiming(EffectTiming.OnCounterTiming, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, source)).toHaveLength(0);
  });

  it("shares the once-per-turn identity across On Play, When Digivolving, and Counter", () => {
    const source = makeSource();
    const effects = [EffectTiming.OnPlay, EffectTiming.WhenDigivolving, EffectTiming.OnCounterTiming].map(
      (timing) => getEffectModule(CARD_ID)!.effectsForTiming(timing, source)[0]!,
    );
    expect(new Set(effects.map(({ effectKey }) => effectKey))).toEqual(new Set([`${CARD_ID}/place-then-delete`]));
    expect(effects.every(({ maxPerTurn }) => maxPerTurn === 1)).toBe(true);
  });

  it("grants operational Fragment (2) while Giromon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "giromon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("giromon"), "Fragment")).toBe(true);
  });

  it("deletes one own exact Ver.3 Digimon and every tied lowest printed-cost opponent Digimon", async () => {
    const source = makeSource();
    const definitions: Record<string, Partial<CardDefinition>> = {
      SELF: { kinds: [CardKind.Digimon], types: ["Ver.3"], playCost: 7 },
      OWN: { kinds: [CardKind.Digimon], types: ["Ver.3"], playCost: 4 },
      LOW_A: { kinds: [CardKind.Digimon], playCost: 3 },
      LOW_B: { kinds: [CardKind.Digimon], playCost: 3 },
      HIGH: { kinds: [CardKind.Digimon], playCost: 4 },
      NO_COST: { kinds: [CardKind.Digimon] },
    };
    const own = [
      { permanentId: "self", inBreeding: false, topCard: { cardId: "SELF" } },
      { permanentId: "own", inBreeding: false, topCard: { cardId: "OWN" } },
    ];
    const opponent = ["LOW_A", "LOW_B", "HIGH", "NO_COST"].map((cardId) => ({
      permanentId: cardId.toLowerCase(),
      inBreeding: false,
      topCard: { cardId },
    }));
    const deletePermanent = vi.fn(async (ids: string[]) => ids.length);
    const ctx = {
      source,
      game: {
        player: (seat: Seat) => (seat === 0 ? { hand: [], battleArea: own } : { battleArea: opponent }),
        opponentOf: () => 1 as Seat,
        definitionOf: (card: { cardId: string }) => definitions[card.cardId]!,
      } as unknown as GameAccess,
      ask: {
        optional: vi.fn(async () => true),
        chooseTargets: vi.fn(async () => ["own"]),
      },
      fx: { deletePermanent } as unknown as Primitives,
    } as unknown as EffectContext;

    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!.resolve(ctx);
    expect(deletePermanent).toHaveBeenNthCalledWith(1, ["own"], "byEffect");
    expect(deletePermanent).toHaveBeenNthCalledWith(2, ["low_a", "low_b"], "byEffect");
  });

  it("inherited leave reaction trashes the opponent's top security exactly once", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-059", as: "host", under: [CARD_ID] }] },
      1: { security: ["BT5-022", "BT5-022"] },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("budgets two leave windows once per turn per Giromon copy, while separate copies remain independent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-059", as: "firstHost", under: [{ card: CARD_ID, as: "firstGiromon" }] },
          { card: "BT26-059", as: "secondHost", under: [{ card: CARD_ID, as: "secondGiromon" }] },
        ],
      },
      1: { security: ["BT5-022", "BT5-022", "BT5-022", "BT5-022"] },
    });
    await s.ready();

    const firstHostId = s.perm("firstHost").permanentId;
    const secondHostId = s.perm("secondHost").permanentId;
    const firstKey = `${s.inst("firstGiromon").instanceId}/${CARD_ID}/inherited-leave-trash-security`;
    const secondKey = `${s.inst("secondGiromon").instanceId}/${CARD_ID}/inherited-leave-trash-security`;
    expect(firstKey).not.toBe(secondKey);

    await advance(s.engine).fireSubTrigger("whenLeavesPlay", { deletedPermanentId: firstHostId });
    await advance(s.engine).fireSubTrigger("whenLeavesPlay", { deletedPermanentId: firstHostId });
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[1]!.trash).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenLeavesPlay", { deletedPermanentId: secondHostId });
    await advance(s.engine).fireSubTrigger("whenLeavesPlay", { deletedPermanentId: secondHostId });
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(2);

    const watchers = observe(s.engine).subscriptions("whenLeavesPlay");
    expect(watchers.map(({ oncePerTurnKey }) => oncePerTurnKey)).toEqual(expect.arrayContaining([firstKey, secondKey]));
  });
});
