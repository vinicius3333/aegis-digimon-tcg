import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-106.js";

describe("BT12-106 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-106");
    expect(module?.cardId).toBe("BT12-106");
    const source = {
      instanceId: "source-106",
      cardId: "BT12-106",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });

  it("registers its printed Security effect", () => {
    const module = getEffectModule("BT12-106");
    const source = { instanceId: "source-106", cardId: "BT12-106", ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
});

it("suspends opposing Digimon and Tamers with its Main effect", async () => {
  const s = setupEngine({
    0: { hand: [{ card: "BT12-106", as: "option" }], battleArea: [{ card: "BT12-045", as: "green" }] },
    1: {
      battleArea: [{ card: "BT1-009", as: "digimon" }, { card: "BT12-091", as: "tamer" }],
      security: ["BT1-009"],
    },
  }, { autoAcceptOptional: true, autoSelectCards: true });
  await s.ready();
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("digimon").isSuspended && s.perm("tamer").isSuspended);
  expect(s.perm("digimon").isSuspended).toBe(true);
  expect(s.perm("tamer").isSuspended).toBe(true);
});
