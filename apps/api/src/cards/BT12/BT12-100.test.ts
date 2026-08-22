import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-100.js";

describe("BT12-100 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-100");
    expect(module?.cardId).toBe("BT12-100");
    const source = {
      instanceId: "source-100",
      cardId: "BT12-100",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });
});

it("registers and resolves the printed Security deletion", async () => {
  const module = getEffectModule("BT12-100");
  const source = { instanceId: "source-100", cardId: "BT12-100", ownerSeat: 0, isOnBattleArea: () => false } as never;
  expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  const s = setupEngine({
    0: { security: [{ card: "BT12-100", as: "option", faceUp: true }] },
    1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
  }, { autoSelectCards: true });
  await s.ready();
  await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
});

it("can decline the optional player attack after unsuspending Shoutmon X7", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-100", as: "option" }], battleArea: [{ card: "BT12-112", as: "shoutmon", suspended: true }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
    },
    { autoAcceptOptional: false, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 9;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("shoutmon").isSuspended === false);
  expect(s.perm("shoutmon").isSuspended).toBe(false);
  expect(s.engine.combat.isAttacking).toBe(false);
});

it("deletes an opposing Digimon and lets a Shoutmon X7: Superior Mode attack", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT12-100", as: "option" }], battleArea: [{ card: "BT12-112", as: "shoutmon", suspended: true }] },
    1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-009"] },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  s.state.memory = 9;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[1]!.battleArea.length === 0);
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.decisions.every(({ req }) => req.sourceCardId === "BT12-100")).toBe(true);
});
