import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-070.js";

describe("EX6-070 Gate of Deadly Sins", () => {
  it("registers the Main option effect, security effect, and continuous deletion watcher", () => {
    const source = {
      instanceId: "source",
      cardId: "EX6-070",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX6-070")!;
    expect(module.effectsForTiming(EffectTiming.OnUseOption, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnEndTurn, source)).toHaveLength(1);
  });
});
