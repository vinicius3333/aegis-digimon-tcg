import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX6-063.js";

describe("EX6-063 Mirei Mikagura", () => {
  it("registers Barrier grants on play/start main and Angel play/digivolve memory watchers", () => {
    const source = { instanceId: "source", cardId: "EX6-063", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX6-063")!;
    expect(module.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnStartMainPhase, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(2);
  });
  it("registers the security play effect", () => {
    const source = { instanceId: "source", cardId: "EX6-063", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    expect(getEffectModule("EX6-063")!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
});
