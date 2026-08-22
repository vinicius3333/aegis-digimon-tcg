import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-097.js";

describe("BT12-097 handwritten module", () => {
  it("registers its printed OnStartMainPhase effect without declarative effect record", () => {
    const module = getEffectModule("BT12-097");
    expect(module?.cardId).toBe("BT12-097");
    const source = {
      instanceId: "source-097",
      cardId: "BT12-097",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });

  it("places a Save Digimon from trash under Ryoma when the stack has two or fewer cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-097", as: "ryoma" }],
        trash: [{ card: "BT12-008", as: "save" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ryoma"));
    await settle(() => s.perm("ryoma").stack.some(({ cardId }) => cardId === "BT12-008"));
    expect(s.perm("ryoma").stack.map(({ cardId }) => cardId)).toContain("BT12-008");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("BT12-008");
  });

  it("does not load a third card when two cards are already under Ryoma", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-097", as: "ryoma", under: ["BT12-008", "BT12-008"] }],
        trash: [{ card: "BT12-008", as: "save" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ryoma"));
    expect(s.perm("ryoma").stack).toHaveLength(2);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT12-008");
  });
});
