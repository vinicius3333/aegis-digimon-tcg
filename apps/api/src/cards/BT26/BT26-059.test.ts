import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-059.js";
import "../index.js";

const CARD_ID = "BT26-059";

describe("BT26-059 Plutomon", () => {
  it("digivolves from an off-color level 5 [TS] Digimon for alternate cost 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-039", as: "base" }],
          hand: [{ card: "BT26-059", as: "plutomon" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("plutomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("plutomon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("reduces play cost only when its still-counted hand is strictly smaller (Q7074-Q7075)", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: "BT26-059", as: "plutomon" }] },
      1: { hand: ["BT5-022", "BT5-022"] },
    });
    reduced.state.memory = 7;
    await reduced.ready();
    expect(
      reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("plutomon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID));
    expect(reduced.state.memory).toBe(0);

    const tied = setupEngine({
      0: { hand: [{ card: "BT26-059", as: "plutomon" }] },
      1: { hand: ["BT5-022"] },
    });
    tied.state.memory = 7;
    await tied.ready();
    expect(tied.engine.applyIntent(0, { type: "playCard", instanceId: tied.inst("plutomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => tied.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID));
    expect(tied.state.memory).toBe(-6); // full printed play cost 13, no strict-fewer reduction
  });

  it("can trash the hand cost during the opponent's turn without playing the Titan (Q7076)", async () => {
    const handCard = { instanceId: "hand-card", cardId: "HAND" };
    const trashTitan = { instanceId: "trash-titan", cardId: "TITAN" };
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "plutomon" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => false,
    } as unknown as CardSource;
    const trash = vi.fn<(...args: any[]) => any>(async () => []);
    const playInstances = vi.fn<(...args: any[]) => any>(async () => []);
    const ctx = {
      source,
      game: {
        player: () => ({ hand: [handCard], trash: [trashTitan] }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TITAN"
            ? { kinds: [CardKind.Digimon], types: ["Titan"], level: 4 }
            : { kinds: [CardKind.Option] },
      },
      ask: {
        selectCards: vi.fn<(...args: any[]) => any>(async (input: unknown, opts: { candidates: string[] }) => [
          opts.candidates[0]!,
        ]),
      },
      fx: { trash, playInstances },
    } as unknown as EffectContext;

    const effect = module.effectsForTiming(EffectTiming.OnPlay, source)[0]!;
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(trash).toHaveBeenCalledWith([handCard.instanceId], { byEffectSeat: 0 });
    expect(playInstances).not.toHaveBeenCalled();
  });

  it("does not play the Titan when the hand-trash cost is prevented", async () => {
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "plutomon" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as unknown as CardSource;
    const playInstances = vi.fn();
    const ctx = {
      source,
      game: {
        player: () => ({
          hand: [{ instanceId: "cost", cardId: "HAND" }],
          trash: [{ instanceId: "titan", cardId: "TITAN" }],
        }),
        definitionOf: (card: { cardId: string }) =>
          card.cardId === "TITAN" ? { kinds: [CardKind.Digimon], types: ["Titan"] } : { kinds: [CardKind.Option] },
      },
      ask: { selectCards: vi.fn(async (_ctx, options: { candidates: string[] }) => [options.candidates[0]!]) },
      fx: { trash: vi.fn(async () => []), playInstances },
    } as unknown as EffectContext;

    await module.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!.resolve(ctx);
    expect(playInstances).not.toHaveBeenCalled();
  });

  it("shares one once-per-turn key across all three play effects", () => {
    const source = {
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
    } as unknown as CardSource;
    const effects = [EffectTiming.OnPlay, EffectTiming.WhenDigivolving, EffectTiming.OnAllyAttack].map(
      (timing) => module.effectsForTiming(timing, source)[0]!,
    );
    expect(new Set(effects.map(({ effectKey }) => effectKey))).toEqual(
      new Set(["BT26-059/trash-hand-play-titan-from-trash"]),
    );
    expect(effects.every(({ maxPerTurn }) => maxPerTurn === 1)).toBe(true);
  });
});
