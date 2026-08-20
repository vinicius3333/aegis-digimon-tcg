import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX9-021.js";

describe("EX9-021", () => {
  const source = { instanceId: "source", cardId: "EX9-021", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the DNA digivolving protection and highest-level deletion effect", () => expect(getEffectModule("EX9-021")!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(1));
  it("registers a once-per-turn end-of-attack effect", () => expect(getEffectModule("EX9-021")!.effectsForTiming(EffectTiming.OnEndAttack, source)[0]?.maxPerTurn).toBe(1));
});
