import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-103.js";

describe("BT12-103 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-103");
    expect(module?.cardId).toBe("BT12-103");
    const source = {
      instanceId: "source-103",
      cardId: "BT12-103",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });
});

it("reduces an opposing Digimon by 4000 DP for the turn", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT12-103", as: "option" }], battleArea: [{ card: "BT12-033", as: "yellow" }] },
    1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-009"] },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  s.state.memory = 2;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("target").currentDP === 1000);
  expect(s.perm("target").currentDP).toBe(1000);
});
