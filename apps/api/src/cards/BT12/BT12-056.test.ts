import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-056.js";

describe("BT12-056 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-056");
    expect(module?.cardId).toBe("BT12-056");
    const source = {
      instanceId: "source-056",
      cardId: "BT12-056",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("gains memory when an opposing Digimon becomes suspended during its turn", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-056", as: "gran" }] },
    1: { battleArea: [{ card: "BT1-009", as: "target" }] },
  });
  await s.ready();
  s.state.memory = 0;
  await advance(s.engine).fireForPermanent(EffectTiming.OnTappedAnyone, s.perm("gran"), {
    suspendedPermanentId: s.perm("target").permanentId,
  });
  expect(s.state.memory).toBe(1);
});
