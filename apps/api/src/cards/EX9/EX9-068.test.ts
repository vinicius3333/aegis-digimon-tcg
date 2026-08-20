import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX9-068.js";

describe("EX9-068", () => {
  const source = { instanceId: "source", cardId: "EX9-068", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers start-of-turn memory setting and security play", () => {
    expect(getEffectModule("EX9-068")!.effectsForTiming(EffectTiming.OnStartTurn, source)).toHaveLength(1);
    expect(getEffectModule("EX9-068")!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
  it("registers the cost-seven-or-more Cyborg/Machine/DM play response", () => expect(getEffectModule("EX9-068")!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1));
});
