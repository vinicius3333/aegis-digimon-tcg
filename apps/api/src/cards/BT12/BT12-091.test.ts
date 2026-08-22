import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-091.js";

describe("BT12-091 handwritten module", () => {
  it("registers its printed OnStartMainPhase effect without declarative effect record", () => {
    const module = getEffectModule("BT12-091");
    expect(module?.cardId).toBe("BT12-091");
    const source = {
      instanceId: "source-091",
      cardId: "BT12-091",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });

  it("places a Save Digimon under Airu and gives an opposing Digimon -2000 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-091", as: "airu" }], hand: [{ card: "BT12-008", as: "save" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 5000 }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("airu"));
    await settle(() => s.perm("airu").stack.some(({ cardId }) => cardId === "BT12-008"));
    expect(s.perm("airu").stack.map(({ cardId }) => cardId)).toContain("BT12-008");
    expect(s.perm("opponent").currentDP).toBe(3000);
  });
});
