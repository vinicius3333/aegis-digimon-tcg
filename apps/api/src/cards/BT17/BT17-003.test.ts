import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT17-003.js";

const source = { instanceId: "source", cardId: "BT17-003", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT17-003", () => {
  it("registers the inherited once-per-turn Tamer-stack watcher", () => {
    const module = getEffectModule("BT17-003");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });
});
