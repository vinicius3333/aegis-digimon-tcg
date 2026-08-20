import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX4-072.js";

describe("EX4-072 Digital Translator", () => {
  it("registers separate Main and Security effects for the erratared name set", () => {
    const source = { instanceId: "source", cardId: "EX4-072", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX4-072")!;
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
});
