import { describe, it, expect, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT26-081.js";

// A3 for BT26-081 (Mervamon, BT26): "[All Turns] All of your [Iliad] trait Digimon gain
// <Alliance>, <Reboot>, <Blocker> and +2000 DP."
//
// FAILS-WHEN-REVERTED: dropping the `hasIliadTrait` filter (or any of the 3 keyword
// grants / the DP grant) either grants to a non-Iliad Digimon or misses one of the 4
// buffs; this test asserts all 4 land, and ONLY on the Iliad-trait permanent.

const CARD_ID = "BT26-081";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "mervamon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "self-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-081 [All Turns]: group-grant Alliance/Reboot/Blocker/+2000 DP to Iliad Digimon", () => {
  it("grants all four buffs to the Iliad permanent, and nothing to the non-Iliad one", async () => {
    const iliad = { permanentId: "own-iliad", topCard: { cardId: "ILIAD-1" }, inBreeding: false };
    const other = { permanentId: "own-other", topCard: { cardId: "OTHER-1" }, inBreeding: false };
    const players = [{ seat: 0 as Seat, battleArea: [iliad, other] }];

    const game: GameAccess = {
      player: () => players[0] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ cardId: card.cardId, types: card.cardId === "ILIAD-1" ? ["Iliad"] : [] }),
    } as unknown as GameAccess;

    const grants: Array<[string, string]> = [];
    const dpChanges: Array<[string, number]> = [];
    const fx = {
      grantKeyword: vi.fn<(...args: any[]) => any>((permanentId: string, keyword: string) =>
        grants.push([permanentId, keyword]),
      ),
      modifyDP: vi.fn<(...args: any[]) => any>((permanentId: string, delta: number) =>
        dpChanges.push([permanentId, delta]),
      ),
    } as unknown as Primitives;

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask: {} } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    const groupGrant = effects.find((e) => e.effectKey === `${CARD_ID}/all-turns-iliad-group-grant`);
    expect(groupGrant).toBeDefined();

    await groupGrant!.resolve(ctx);

    expect(grants).toEqual([
      ["own-iliad", "Alliance"],
      ["own-iliad", "Reboot"],
      ["own-iliad", "Blocker"],
    ]);
    expect(dpChanges).toEqual([["own-iliad", 2000]]);
  });
});

describe("BT26-081 engine behavior", () => {
  it.each([
    ["BT10-083", 2, "Minervamon by exact name"],
    ["BT25-055", 4, "a level 5 with the TS trait"],
  ])("uses the printed alternate evolution from %s for cost %i (%s)", async (baseCard, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: CARD_ID, as: "mervamon" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = cost;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mervamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("mervamon").instanceId);

    expect(s.state.memory).toBe(0);
  });

  it("may play nothing and still applies the DP reduction, per Q7115", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "mervamon" }] },
        1: { battleArea: [{ card: "AD1-003", as: "target", dp: 10000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("mervamon"), {
      subjectPermanentId: s.perm("mervamon").permanentId,
    });

    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("plays multiple Iliad cards within the total cost-8 budget before scaling the DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-009", as: "iliadHand" }],
          trash: [{ card: "BT26-009", as: "iliadTrash" }],
          battleArea: [{ card: CARD_ID, as: "mervamon" }],
        },
        1: { battleArea: [{ card: "AD1-003", as: "target", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("mervamon"), {
      subjectPermanentId: s.perm("mervamon").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3, 5000);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      CARD_ID,
      "BT26-009",
      "BT26-009",
    ]);
    expect(s.perm("target").currentDP).toBe(8000);
  });

  it("continuously grants all four buffs only to Iliad Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "mervamon" },
          { card: "BT25-062", as: "iliad", dp: 1000 },
          { card: "AD1-001", as: "other", dp: 3000 },
        ],
      },
    });
    await s.ready();

    for (const keyword of ["Alliance", "Reboot", "Blocker"]) {
      expect(observe(s.engine).hasKeyword(s.perm("iliad"), keyword)).toBe(true);
      expect(observe(s.engine).hasKeyword(s.perm("other"), keyword)).toBe(false);
    }
    expect(s.perm("iliad").currentDP).toBe(3000);
    expect(s.perm("other").currentDP).toBe(3000);
  });
});
