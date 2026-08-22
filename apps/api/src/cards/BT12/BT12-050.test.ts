import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-050.js";

describe("BT12-050 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-050");
    expect(module?.cardId).toBe("BT12-050");
    const source = {
      instanceId: "source-050",
      cardId: "BT12-050",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });
});

it("grants Piercing to a Free inherited host during its controller's turn", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT12-022", as: "host", under: ["BT12-050"] }] } });
  await s.ready();
  expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
});
