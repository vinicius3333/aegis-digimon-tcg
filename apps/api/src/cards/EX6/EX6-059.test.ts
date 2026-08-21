import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX6-059.js";

describe("EX6-059 BeelStarmon", () => {
  it("registers hand trash on play/digivolving, Scapegoat, and a once-per-turn purple revival watcher", () => {
    const source = {
      instanceId: "source",
      cardId: "EX6-059",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX6-059")!;
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(2);
    expect(module.effectsForTiming(EffectTiming.None, source).map((effect) => effect.maxPerTurn)).toEqual(
      expect.arrayContaining([1]),
    );
  });

  it("installs the opponent-hand-trash watcher", async () => {
    const source = {
      instanceId: "source",
      cardId: "EX6-059",
      ownerSeat: 0,
      definition: {},
      permanent: () => ({ permanentId: "perm" }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const installed: unknown[] = [];
    const effect = getEffectModule("EX6-059")!.effectsForTiming(EffectTiming.None, source)[1]!;
    await effect.resolve({
      source,
      game: {
        opponentOf: (seat: number) => (seat === 0 ? 1 : 0),
        player: () => ({ hand: [], trash: [] }),
      },
      fx: { subscribeSubTrigger: (sub: unknown) => installed.push(sub) },
      ask: {},
    } as never);
    expect(installed[0]).toMatchObject({ event: "whenHandTrashed", sourcePermanentId: "perm" });
  });
});
