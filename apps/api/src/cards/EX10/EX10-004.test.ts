import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { EffectTiming, Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX10-004.js";

describe("EX10-004 Cupimon inherited move trigger", () => {
  it("fires in the engine when a Lucemon moves from breeding to battle", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-013", as: "lucemon", under: ["EX10-004"] },
          hand: [{ card: "BT1-009", as: "payment" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("lucemon").permanentId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.memory === 1 && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
  });

  it("trashes a hand card before drawing and gaining memory", async () => {
    const source: CardSource = {
      instanceId: "host#cupimon",
      cardId: "EX10-004",
      ownerSeat: 0,
      definition: getCardDefinition("EX10-004")!,
      permanent: () => ({ permanentId: "host" }) as never,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const hand = [{ instanceId: "cost#1", cardId: "BT1-009" }];
    const lucemon = {
      permanentId: "lucemon",
      controllerSeat: 0,
      topCard: { instanceId: "lucemon#1", cardId: "EX10-013" },
    };
    let subscription: any;
    const trashed: string[][] = [];
    let drawn = 0;
    let gained = 0;
    const ctx: any = {
      source,
      trigger: {},
      game: {
        player: () => ({ hand }),
        permanentById: (id: string) => (id === "lucemon" ? lucemon : undefined),
        definitionOf: (card: { cardId: string }) => getCardDefinition(card.cardId)!,
      },
      fx: {
        subscribeSubTrigger: (sub: unknown) => {
          subscription = sub;
        },
      },
    };
    const effect = getEffectModule("EX10-004")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve(ctx);
    expect(subscription).toBeDefined();
    expect(subscription.matches({ ...ctx, trigger: { subjectPermanentId: "lucemon" } })).toBe(true);

    const runCtx = {
      ...ctx,
      trigger: { subjectPermanentId: "lucemon" },
      ask: { selectCards: async () => ["cost#1"] },
      fx: {
        trash: async (ids: string[]) => {
          trashed.push(ids);
        },
        draw: () => {
          drawn += 1;
        },
        gainMemory: () => {
          gained += 1;
        },
      },
    };
    await subscription.run(runCtx);
    expect(trashed).toEqual([["cost#1"]]);
    expect(drawn).toBe(1);
    expect(gained).toBe(1);
  });
});
