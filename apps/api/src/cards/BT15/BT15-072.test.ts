import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT15-072.js";

const source = {
  instanceId: "source",
  cardId: "BT15-072",
  ownerSeat: 0,
  definition: {},
  permanent: () => ({ permanentId: "perm" }),
  isOnBattleArea: () => true,
  isOwnersTurn: () => true,
  hasColor: () => true,
} as never;

describe("BT15-072", () => {
  it("registers Blocker and the all-turns leave-prevention replacement without a timing cap", () => {
    const effects = getEffectModule("BT15-072")?.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(2);
    expect(effects?.[0]).toMatchObject({ effectKey: "BT15-072/blocker" });
    expect(effects?.[1]).toMatchObject({ effectKey: "BT15-072/protect-dark-masters" });
    expect(effects?.[1]?.maxPerTurn).toBe(-1);
  });

  it("installs a would-leave replacement", async () => {
    const effects = getEffectModule("BT15-072")?.effectsForTiming(EffectTiming.None, source);
    const installed: unknown[] = [];
    await effects?.[1]?.resolve({
      source,
      game: {},
      fx: { subscribeReplacement: (replacement: unknown) => installed.push(replacement) },
      ask: {},
    } as never);
    expect(installed[0]).toMatchObject({ event: "wouldLeavePlay", mode: "prevent" });
  });
});
