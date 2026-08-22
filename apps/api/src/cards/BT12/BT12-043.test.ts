import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-043.js";

describe("BT12-043 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-043");
    expect(module?.cardId).toBe("BT12-043");
    const source = {
      instanceId: "source-043",
      cardId: "BT12-043",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("buffs Marcus Damon cards during its controller's turn", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-043", as: "shine" },
        { card: "BT12-092", dp: 3000, as: "marcus" },
      ],
    },
  });
  await s.ready();
  expect(s.perm("marcus").currentDP).toBe(s.perm("marcus").baseDP + 3000);
  expect(observe(s.engine).hasKeyword(s.perm("marcus"), "SecurityAttack")).toBe(true);
});

it("scales the digivolution DP reduction for each yellow or red Tamer", async () => {
  const s = setupEngine({
    0: {
      battleArea: [
        { card: "BT12-043", as: "shine" },
        { card: "BT12-092", as: "yellowTamer" },
        { card: "BT12-092", as: "redTamer" },
      ],
    },
    1: {
      battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }],
      security: ["BT1-009"],
    },
  });
  await s.ready();
  await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("shine"));
  expect(s.perm("target").currentDP).toBe(4000);
  expect(observe(s.engine).securityDp(1)).toBe(-6000);
});
