import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./LM-004.js";
describe("LM-004", () => { it("registers its inherited Jellymon hand-trash watcher", () => {
  const source = { cardId: "LM-004", ownerSeat: 0, permanent: () => ({ permanentId: "p1" }) } as never;
  expect(getEffectModule("LM-004")!.effectsForTiming(EffectTiming.None, source)[0]).toMatchObject({ isInherited: true, maxPerTurn: 1 });
}); });
