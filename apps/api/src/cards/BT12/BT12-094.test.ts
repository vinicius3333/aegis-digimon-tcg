import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-094.js";

describe("BT12-094 handwritten module", () => {
  it("registers its printed OnStartMainPhase effect without declarative effect record", () => {
    const module = getEffectModule("BT12-094");
    expect(module?.cardId).toBe("BT12-094");
    const source = {
      instanceId: "source-094",
      cardId: "BT12-094",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });

  it("places a Save Digimon under Yuu and gains 1 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-094", as: "yuu" }], hand: [{ card: "BT12-008", as: "save" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yuu"));
    await settle(() => s.perm("yuu").stack.some(({ cardId }) => cardId === "BT12-008"));
    expect(s.perm("yuu").stack.map(({ cardId }) => cardId)).toContain("BT12-008");
    expect(s.state.memory).toBe(1);
  });
});
