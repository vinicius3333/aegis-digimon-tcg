import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-055.js";

describe("BT12-055 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-055");
    expect(module?.cardId).toBe("BT12-055");
    const source = {
      instanceId: "source-055",
      cardId: "BT12-055",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("still permits the follow-up attack when the digivolution was not DNA", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT12-055", as: "dino" }] },
      1: { battleArea: [{ card: "BT12-043", as: "target", dp: 15000 }] },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
  await s.ready();
  const before = s.perm("dino").currentDP;
  await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("dino"));
  expect(s.perm("dino").currentDP).toBe(before);
  expect(s.perm("target").isSuspended).toBe(false);
});
