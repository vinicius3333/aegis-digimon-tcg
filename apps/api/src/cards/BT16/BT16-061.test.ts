import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT16-061.js";

const source = { instanceId: "source", cardId: "BT16-061", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT16-061", () => {
  it("registers Collision and the attack-target-switched watcher", () => {
    const module = getEffectModule("BT16-061");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2);
  });

  it("registers the inherited once-per-turn play-from-trash effect", () => {
    const effects = getEffectModule("BT16-061")!.effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({ isInherited: true, maxPerTurn: 1, optional: true });
  });
});
