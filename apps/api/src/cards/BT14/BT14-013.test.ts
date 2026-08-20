import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT14-013.js";

describe("BT14-013", () => {
  const source = { instanceId: "source", cardId: "BT14-013", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers start-main digivolution cost reduction and inherited end-turn attack", () => {
    expect(getEffectModule("BT14-013")!.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
    expect(getEffectModule("BT14-013")!.effectsForTiming(EffectTiming.OnEndTurn, source)[0]?.maxPerTurn).toBe(1);
  });
});
