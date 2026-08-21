import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT17-034.js";

const source = {
  instanceId: "source",
  cardId: "BT17-034",
  ownerSeat: 0,
  definition: {},
  permanent: () => undefined,
  isOnBattleArea: () => true,
  isOwnersTurn: () => true,
  hasColor: () => true,
} as unknown as CardSource;

describe("BT17-034", () => {
  it("registers dual security branches, security-trash recovery, and inherited DP", () => {
    const module = getEffectModule("BT17-034");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnDiscardSecurity, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2);
  });

  it("recovers when an effect trashes a card from security with Leon Alexander stacked", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-034", as: "bulkmon", under: ["BT17-086"] }],
        security: ["BT1-001"],
        deck: ["BT1-002"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-002")).toBe(true);
  });
});
