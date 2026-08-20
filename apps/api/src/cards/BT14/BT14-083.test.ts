import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT14-083.js";

describe("BT14-083", () => {
  const source = { instanceId: "source", cardId: "BT14-083", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers on-play trashing, opponent-source response, and security play", () => {
    expect(getEffectModule("BT14-083")!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(getEffectModule("BT14-083")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
    expect(getEffectModule("BT14-083")!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
});
