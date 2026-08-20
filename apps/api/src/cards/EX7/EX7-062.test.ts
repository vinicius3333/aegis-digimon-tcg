import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX7-062.js";

describe("EX7-062", () => {
  const source = { instanceId: "source", cardId: "EX7-062", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the hand-trash/delete effect on digivolving", () => expect(getEffectModule("EX7-062")!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(1));
  it("registers a once-per-turn end-of-turn trash play effect", () => expect(getEffectModule("EX7-062")!.effectsForTiming(EffectTiming.OnEndTurn, source)[0]?.maxPerTurn).toBe(1));
});
