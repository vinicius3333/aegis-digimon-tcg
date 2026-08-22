import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-087.js";

describe("BT12-087 handwritten module", () => {
  it("registers its printed OnStartMainPhase effect without declarative effect record", () => {
    const module = getEffectModule("BT12-087");
    expect(module?.cardId).toBe("BT12-087");
    const source = {
      instanceId: "source-087",
      cardId: "BT12-087",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
  });

  it("places a Save Digimon from hand under Taiki and draws 1 at the start of main phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-087", as: "taiki" }],
        hand: [{ card: "BT12-008", as: "save" }],
        deck: ["BT1-009"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("taiki"));
    await settle(() => s.perm("taiki").stack.some(({ cardId }) => cardId === "BT12-008"));
    expect(s.perm("taiki").stack.map(({ cardId }) => cardId)).toContain("BT12-008");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });
});
