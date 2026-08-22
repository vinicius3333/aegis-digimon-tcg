import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-101.js";
import "./BT12-102.js";
import "./BT12-103.js";
import "./BT12-104.js";
import "./BT12-105.js";
import "./BT12-106.js";
import "./BT12-107.js";
import "./BT12-108.js";
import "./BT12-109.js";
import "./BT12-110.js";

describe("BT12-101 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-101");
    expect(module?.cardId).toBe("BT12-101");
    const source = {
      instanceId: "source-101",
      cardId: "BT12-101",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });
});

it("registers the printed Security activation for BT12-101", () => {
  const module = getEffectModule("BT12-101");
  const source = { instanceId: "source-101", cardId: "BT12-101", ownerSeat: 0, isOnBattleArea: () => false } as never;
  expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
});

it("does not register unprinted Security effects for BT12-102 through BT12-110", () => {
  for (const cardId of [
    "BT12-102",
    "BT12-103",
    "BT12-104",
    "BT12-105",
    "BT12-106",
    "BT12-107",
    "BT12-108",
    "BT12-109",
    "BT12-110",
  ]) {
    const module = getEffectModule(cardId);
    const source = { instanceId: `source-${cardId}`, cardId, ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source), cardId).toEqual([]);
  }
});
