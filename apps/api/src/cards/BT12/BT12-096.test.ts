import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-096.js";

describe("BT12-096 handwritten module", () => {
  it("registers its printed OnStartTurn effect without declarative effect record", () => {
    const module = getEffectModule("BT12-096");
    expect(module?.cardId).toBe("BT12-096");
    const source = {
      instanceId: "source-096",
      cardId: "BT12-096",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });

  it("sets memory to 3 at the start of your turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-096", as: "tagiru" }] } });
    await s.ready();
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tagiru"));
    expect(s.state.memory).toBe(3);
  });

  it("does not reset memory above 2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-096", as: "tagiru" }] } });
    await s.ready();
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tagiru"));
    expect(s.state.memory).toBe(3);
  });
});
