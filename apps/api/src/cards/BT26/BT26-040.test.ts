import { CardKind, EffectTiming, Phase, type CardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it, vi } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import module from "./BT26-040.js";
import "../index.js";

const CARD_ID = "BT26-040";

function source(): CardSource {
  return {
    instanceId: "drimogemon",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: {} as CardDefinition,
    permanent: () => ({ permanentId: "drimogemon-permanent" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => true,
  };
}

describe("BT26-040 Drimogemon", () => {
  it("uses the exact off-color Lv.3 DM alternate evolution for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-014", as: "blueDm" }],
        hand: [{ card: CARD_ID, as: "drimogemon" }],
        deck: ["BT5-022"],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueDm").permanentId,
        instanceId: s.inst("drimogemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blueDm").topCard.cardId === CARD_ID);
    expect(s.state.memory).toBe(0);
  });

  it("On Play suspends only an unsuspended opponent Digimon, places one hand card face down at bottom, and gains DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "drimogemon" },
            { card: "AD1-001", as: "material" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT5-022", as: "opponent" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("drimogemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.currentDP === 6000 &&
          permanent.stack.some((card) => card.instanceId === s.inst("material").instanceId),
      ),
    );
    const drimogemon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)!;

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(drimogemon.stack[0]).toMatchObject({ instanceId: s.inst("material").instanceId, faceUp: false });
    expect(drimogemon.currentDP).toBe(6000);
  });

  it("When Moving resolves for itself and not for an unrelated move", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: CARD_ID, as: "mover" },
          hand: [{ card: "AD1-001", as: "material" }],
        },
        1: { battleArea: [{ card: "BT5-022", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mover").stack.length === 1);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("mover").stack[0]!.faceUp).toBe(false);

    expect(s.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
  });

  it("does not grant DP when placement fails and counts all existing face-down cards after successful payment", async () => {
    const cardSource = source();
    const hand = [{ instanceId: "chosen", cardId: "CHOSEN" }];
    const host = {
      permanentId: "drimogemon-permanent",
      topCard: { cardId: CARD_ID },
      stack: [
        { instanceId: "old-face-down", faceUp: false },
        { instanceId: "face-up", faceUp: true },
      ],
    };
    const modifyDP = vi.fn();
    const ctx = {
      source: cardSource,
      game: {
        opponentOf: () => 1 as Seat,
        player: (seat: Seat) => ({ hand: seat === 0 ? hand : [], battleArea: [] }),
        permanentById: () => host,
        definitionOf: () => ({ kinds: [CardKind.Digimon] }),
      } as unknown as GameAccess,
      ask: { selectCards: vi.fn(async () => ["chosen"]) },
      fx: { placeUnder: vi.fn(async () => []), modifyDP },
    } as unknown as EffectContext;
    const effect = module.effectsForTiming(EffectTiming.OnPlay, cardSource)[0]!;
    await effect.resolve(ctx);
    expect(modifyDP).not.toHaveBeenCalled();

    ctx.fx.placeUnder = vi.fn(async () => {
      host.stack.unshift({ instanceId: "chosen", faceUp: false });
      return [hand[0]];
    }) as never;
    await effect.resolve(ctx);
    expect(ctx.fx.placeUnder).toHaveBeenCalledWith("drimogemon-permanent", ["chosen"], { faceUp: false });
    expect(modifyDP).toHaveBeenCalledWith("drimogemon-permanent", 2000, expect.anything());
  });

  it("inherits Piercing onto a realistic evolution host while standalone behavior remains top-level", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-043", as: "host", under: [{ card: CARD_ID, as: "drimogemonSource" }] },
          { card: CARD_ID, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Piercing")).toBe(true);
    expect([...s.perm("standalone").keywords]).toEqual(expect.arrayContaining(["Training", "Piercing"]));
  });
});
