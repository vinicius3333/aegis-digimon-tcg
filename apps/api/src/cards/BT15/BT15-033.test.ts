import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT15-033.js";

const source = {
  instanceId: "source",
  cardId: "BT15-033",
  ownerSeat: 0,
  definition: {},
  permanent: () => ({ permanentId: "perm" }),
  isOnBattleArea: () => true,
  isOwnersTurn: () => true,
  hasColor: () => true,
} as never;

describe("BT15-033", () => {
  it("registers an inherited replacement effect at static timing", () => {
    const effects = getEffectModule("BT15-033")?.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(1);
    expect(effects?.[0]).toMatchObject({ isInherited: true });
  });

  it("installs a battle-deletion replacement that trashes security", async () => {
    const effects = getEffectModule("BT15-033")?.effectsForTiming(EffectTiming.None, source);
    const installed: unknown[] = [];
    await effects?.[0]?.resolve({
      source,
      game: {},
      fx: { subscribeReplacement: (replacement: unknown) => installed.push(replacement) },
      ask: {},
    } as never);
    expect(installed[0]).toMatchObject({ event: "wouldBeDeleted", mode: "prevent" });
  });
});
