import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-092.js";

describe("BT12-092 handwritten module", () => {
  it("registers its printed OnStartMainPhase effect without declarative effect record", () => {
    const module = getEffectModule("BT12-092");
    expect(module?.cardId).toBe("BT12-092");
    const source = {
      instanceId: "source-092",
      cardId: "BT12-092",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.OnTappedAnyone, source).length).toBeGreaterThan(0);
  });

  it("pays 1 memory and becomes a 3000 DP Digimon when Agumon or Greymon is present", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-092", as: "marcus" }, { card: "BT12-034", as: "agumon" }] } });
    await s.ready();
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("marcus"));
    expect(s.state.memory).toBe(4);
    expect(s.perm("marcus").currentDP).toBe(3000);
  });
});
