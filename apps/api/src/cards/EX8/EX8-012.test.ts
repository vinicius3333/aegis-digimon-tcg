import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX8-012.js";

describe("EX8-012", () => {
  const source = { instanceId: "source", cardId: "EX8-012", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the draw/trash digivolving effect", () => expect(getEffectModule("EX8-012")!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1));
  it("registers the once-per-turn inherited opponent-deletion memory effect", () => expect(getEffectModule("EX8-012")!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)[0]?.maxPerTurn).toBe(1));
});
