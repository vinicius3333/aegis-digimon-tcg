import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-031.js";

describe("BT12-031 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-031");
    expect(module?.cardId).toBe("BT12-031");
    const source = {
      instanceId: "source-031",
      cardId: "BT12-031",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("gains DP, Blocker and Security Attack from two source colors", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT12-031", as: "fighter", under: ["BT12-021", "BT12-047"] }] } });
  await s.ready();
  expect(s.perm("fighter").currentDP).toBe(s.perm("fighter").baseDP + 2000);
  expect(observe(s.engine).hasKeyword(s.perm("fighter"), "Blocker")).toBe(true);
  expect(observe(s.engine).hasKeyword(s.perm("fighter"), "SecurityAttack")).toBe(true);
});
