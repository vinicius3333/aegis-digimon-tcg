import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT17-006.js";

const source = { instanceId: "source", cardId: "BT17-006", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as unknown as CardSource;

describe("BT17-006", () => {
  it("registers the inherited Tamer-placement reaction", () => {
    const module = getEffectModule("BT17-006");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });
});
