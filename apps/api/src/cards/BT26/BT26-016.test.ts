import { EffectTiming, type CardDefinition, type CardInstance, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, Primitives, ReplacementInstallPrevent } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-016.js";
import "../index.js";

const CARD_ID = "BT26-016";

function primitives(s: ReturnType<typeof setupEngine>): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

function source(instanceId = "holy"): CardSource {
  return {
    instanceId,
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => ({ permanentId: `${instanceId}-permanent`, currentDP: 12000 }),
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
  } as unknown as CardSource;
}

describe("BT26-016 Chronomon: Holy Mode", () => {
  it("evolves from an off-color Lv.5 TS Digimon for exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-061", as: "tsBase" }],
          hand: [{ card: CARD_ID, as: "holy" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("holy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.perm("tsBase").stack.at(-1)?.cardId).toBe("BT24-061");
  });

  it("shares one OPT key across On Play, When Digivolving, and self When Attacking", () => {
    const cardSource = source();
    const effects = [
      ...module.effectsForTiming(EffectTiming.OnPlay, cardSource),
      ...module.effectsForTiming(EffectTiming.WhenDigivolving, cardSource),
      ...module.effectsForTiming(EffectTiming.OnUseAttack, cardSource),
    ];

    expect(effects).toHaveLength(3);
    expect(new Set(effects.map(({ effectKey }) => effectKey))).toEqual(new Set([`${CARD_ID}/delete-then-recovery`]));
    expect(effects.every(({ maxPerTurn }) => maxPerTurn === 1)).toBe(true);
    expect(module.effectsForTiming(EffectTiming.OnAllyAttack, cardSource)).toHaveLength(0);
  });

  it("returns exactly 3 cards selected across both trashes before recovering (Q6976/Q6978-Q6980)", async () => {
    const cardSource = source();
    const ownTrash = [
      { instanceId: "own", cardId: "OWN", ownerSeat: 0 },
      { instanceId: "egg", cardId: "EGG", ownerSeat: 0 },
    ];
    const opposingTrash = [{ instanceId: "opponent", cardId: "OPP", ownerSeat: 1 }];
    const low = { permanentId: "low", currentDP: 12000, topCard: { cardId: "LOW" } };
    const high = { permanentId: "high", currentDP: 13000, topCard: { cardId: "HIGH" } };
    const returnToDeck = vi.fn(async (ids: string[]) =>
      [...ownTrash, ...opposingTrash].filter((c) => ids.includes(c.instanceId)),
    );
    const recoverToSecurity = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        opponentOf: () => 1 as Seat,
        player: (seat: Seat) => (seat === 0 ? { trash: ownTrash } : { trash: opposingTrash, battleArea: [low, high] }),
        definitionOf: () => ({ kinds: ["Digimon"] }),
      },
      ask: {
        chooseTargets: vi.fn(async () => ["low"]),
        optional: vi.fn(async () => true),
        selectCards: vi.fn(async (_ctx, request: { candidates: string[]; min: number; max: number }) => {
          expect(new Set(request.candidates)).toEqual(new Set(["own", "egg", "opponent"]));
          expect(request).toMatchObject({ min: 3, max: 3 });
          return ["opponent", "egg", "own"];
        }),
      },
      fx: { deletePermanent: vi.fn(), returnToDeck, recoverToSecurity },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve(ctx);

    expect(ctx.fx.deletePermanent).toHaveBeenCalledWith(["low"]);
    expect(returnToDeck).toHaveBeenCalledWith(["opponent", "egg", "own"], { toTop: false });
    expect(recoverToSecurity).toHaveBeenCalledWith(0, 1);
  });

  it("does not recover when fewer than all 3 selected cards actually return", async () => {
    const cardSource = source();
    const trash = ["a", "b", "c"].map((instanceId) => ({ instanceId, cardId: instanceId }));
    const recoverToSecurity = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        opponentOf: () => 1 as Seat,
        player: (seat: Seat) => (seat === 0 ? { trash } : { trash: [], battleArea: [] }),
      },
      ask: { optional: async () => true, selectCards: async () => ["a", "b", "c"] },
      fx: { returnToDeck: async () => trash.slice(0, 2), recoverToSecurity },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!.resolve(ctx);

    expect(recoverToSecurity).not.toHaveBeenCalled();
  });

  it("publicly deletes first, returns mixed trash cards, and resolves Recovery +1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          trash: ["BT1-009", "BT1-010"],
          deck: [{ card: "BT1-011", as: "recovery" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 1000 }], trash: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT1-011", faceUp: false });
    expect(s.state.players[0]!.deck.length + s.state.players[1]!.deck.length).toBe(3);
  });

  it("removes a deleted card from trash before its pending On Deletion can activate (Q6977)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          trash: ["BT1-009"],
          deck: [{ card: "BT1-011", as: "recovery" }],
        },
        1: {
          battleArea: [
            { card: "BT10-008", as: "shoutmon", dp: 1000 },
            { card: "AD1-019", as: "tamer" },
          ],
          trash: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));
    await settle(() => s.state.players[1]!.deck.some((card) => card.cardId === "BT10-008"));

    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT10-008");
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT1-011", faceUp: false });
  });

  it("installs a per-copy leave replacement and only prevents after the hidden security card really moved", async () => {
    const firstSource = source("first");
    const secondSource = source("second");
    const installs: ReplacementInstallPrevent[] = [];
    const top = { instanceId: "security", cardId: "HIDDEN", faceUp: false };
    const ctx = {
      source: firstSource,
      game: { player: () => ({ security: [top] }) },
      ask: { optional: async () => true },
      fx: {
        subscribeReplacement: (install: ReplacementInstallPrevent) => installs.push(install),
        returnToDeck: vi.fn(async () => []),
      },
    } as unknown as EffectContext;
    await module.effectsForTiming(EffectTiming.None, firstSource)[0]!.resolve(ctx);
    await module.effectsForTiming(EffectTiming.None, secondSource)[0]!.resolve({ ...ctx, source: secondSource });

    expect(installs.map(({ oncePerTurnKey }) => oncePerTurnKey)).toEqual([
      `first/${CARD_ID}/prevent-leave-return-security`,
      `second/${CARD_ID}/prevent-leave-return-security`,
    ]);
    expect(await installs[0]!.preventCheck(ctx, "first-permanent")).toBe(false);
    ctx.fx.returnToDeck = vi.fn(async () => [top as unknown as CardInstance]);
    expect(await installs[0]!.preventCheck(ctx, "first-permanent")).toBe(true);
  });

  it("publishes printed Piercing and Engage and spends one security to prevent a real deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          security: [{ card: "BT1-009", as: "cost" }],
          deck: [{ card: "BT1-010", as: "oldBottom" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect([...s.perm("holy").keywords]).toEqual(expect.arrayContaining(["Piercing", "Engage"]));

    expect(await primitives(s).deletePermanent([s.perm("holy").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.at(-1)).toMatchObject({ cardId: "BT1-009", faceUp: false });
  });
});
