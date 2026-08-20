import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX6-030.js";

describe("EX6-030 Mastemon", () => {
  it("registers the security-search When Digivolving effect", () => {
    const source = { instanceId: "source", cardId: "EX6-030", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    expect(getEffectModule("EX6-030")!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)[0]?.description).toContain("security stack");
  });
  it("registers the Angel protection replacement", () => {
    const source = { instanceId: "source", cardId: "EX6-030", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    expect(getEffectModule("EX6-030")!.effectsForTiming(EffectTiming.None, source)[0]?.description).toContain("prevent");
  });
});
