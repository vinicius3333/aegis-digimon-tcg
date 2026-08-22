import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX6-057.js";

describe("EX6-057 Belphemon: Rage Mode", () => {
  it("registers On Play/When Digivolving target selection and once-per-turn self-protection", () => {
    const source = {
      instanceId: "source",
      cardId: "EX6-057",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX6-057")!;
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(2);
    expect(module.effectsForTiming(EffectTiming.None, source).map((effect) => effect.maxPerTurn)).toEqual(
      expect.arrayContaining([1]),
    );
  });
});
