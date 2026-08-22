import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-107.js";

describe("BT12-107 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-107");
    expect(module?.cardId).toBe("BT12-107");
    const source = {
      instanceId: "source-107",
      cardId: "BT12-107",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });
});

it("installs the forced start-of-main-phase attack on the chosen opposing Digimon", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT12-107", as: "option" }], battleArea: [{ card: "BT12-061", as: "black" }] },
    1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-009"] },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  s.state.memory = 1;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  const engine = s.engine as typeof s.engine & { continuous: { listCustomEffectGrants(): readonly { instanceId: string; token: string }[] } };
  await settle(() => engine.continuous.listCustomEffectGrants().length > 0);
  expect(engine.continuous.listCustomEffectGrants()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        instanceId: s.perm("target").topCard!.instanceId,
        token: "[Start of Your Main Phase] Attack with this Digimon.",
      }),
    ]),
  );
});

it("registers its printed Security add-to-hand effect", () => {
  const module = getEffectModule("BT12-107");
  const source = { instanceId: "source-107", cardId: "BT12-107", ownerSeat: 0, isOnBattleArea: () => false } as never;
  expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
});

it("returns itself to its owner's hand from Security", async () => {
  const s = setupEngine({ 0: { security: [{ card: "BT12-107", as: "option", faceUp: true }] } });
  await s.ready();
  await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-107");
});
