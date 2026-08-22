import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-049.js";

describe("BT12-049 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-049");
    expect(module?.cardId).toBe("BT12-049");
    const source = {
      instanceId: "source-049",
      cardId: "BT12-049",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.None, source).length).toBeGreaterThan(0);
  });
});

it("provides Blocker as a public keyword", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT12-049", as: "yaki" }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("yaki"), "Blocker")).toBe(true);
});
