import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX6-001.js";

describe("EX6-001 Sakuttomon", () => {
  it("registers an inherited continuous Legend-Arms add-to-stack watcher", () => {
    const source = {
      instanceId: "source",
      cardId: "EX6-001",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const effect = getEffectModule("EX6-001")!.effectsForTiming(EffectTiming.None, source)[0]!;
    expect(effect.isInherited).toBe(true);
    expect(effect.maxPerTurn).toBe(1);
    expect(effect.description).toContain("Legend-Arms");
  });

  it("gains memory only when the newly placed card is Legend-Arms", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["EX6-001", "EX6-007"] }],
        hand: [
          { card: "BT1-010", as: "nonLegendArms" },
          { card: "EX6-007", as: "legendArms" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("nonLegendArms").instanceId]);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("legendArms").instanceId]);
    expect(s.state.memory).toBe(1);
  });
});
