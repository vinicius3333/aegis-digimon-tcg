import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import "./BT17-003.js";

const source = {
  instanceId: "source",
  cardId: "BT17-003",
  ownerSeat: 0,
  definition: {},
  permanent: () => undefined,
  isOnBattleArea: () => true,
  isOwnersTurn: () => true,
  hasColor: () => true,
} as unknown as CardSource;

describe("BT17-003", () => {
  it("registers the inherited once-per-turn Tamer-stack watcher", () => {
    const module = getEffectModule("BT17-003");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });

  it("gains memory when an effect places a Tamer in the host stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-081", as: "host", under: ["BT17-003"] }],
        hand: [{ card: "BT1-089", as: "tamer" }],
      },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("tamer").instanceId]);

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT1-089")).toBe(true);
  });
});
