import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-016.js";

describe("BT12-016 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-016");
    expect(module?.cardId).toBe("BT12-016");
    const source = {
      instanceId: "source-016",
      cardId: "BT12-016",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("deletes an opposing 4000 DP Digimon when digivolving", async () => {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT12-016", as: "war" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 4000, as: "target" }] },
    },
    { autoSelectCards: true },
  );
  await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("war"));
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
});
