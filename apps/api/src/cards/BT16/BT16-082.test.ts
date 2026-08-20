import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT16-082.js";

const source = { instanceId: "source", cardId: "BT16-082", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT16-082", () => {
  it("registers the once-per-turn move-from-breeding watcher", () => {
    const module = getEffectModule("BT16-082");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });

  it("does not expose the watcher at unrelated timings", () => {
    expect(getEffectModule("BT16-082")!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });
});
