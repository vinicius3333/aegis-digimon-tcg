import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-099.js";

describe("BT12-099 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-099");
    expect(module?.cardId).toBe("BT12-099");
    const source = {
      instanceId: "source-099",
      cardId: "BT12-099",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });
});

it("does not register an unprinted Security effect", () => {
  const module = getEffectModule("BT12-099");
  const source = { instanceId: "source-099", cardId: "BT12-099", ownerSeat: 0, isOnBattleArea: () => false } as never;
  expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toEqual([]);
});

it("deletes a 6000 DP or lower Digimon and boosts a Hybrid by 3000", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT12-099", as: "option" }], battleArea: [{ card: "BT12-013", as: "hybrid" }] },
    1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-009"] },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  s.state.memory = 4;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.battleArea.length === 0 && s.perm("hybrid").currentDP !== s.perm("hybrid").baseDP);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.perm("hybrid").currentDP).toBe(s.perm("hybrid").baseDP + 3000);
});
