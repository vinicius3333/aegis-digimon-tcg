import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT12-053.js";

describe("BT12-053 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-053");
    expect(module?.cardId).toBe("BT12-053");
    const source = {
      instanceId: "source-053",
      cardId: "BT12-053",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source).length).toBeGreaterThan(0);
  });
});

it("gains 1 memory when the inherited Digimon deletes an opponent in battle", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-022", as: "host", under: ["BT12-053"] }] },
  });
  await s.ready();
  s.state.memory = 0;
  await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
  expect(s.state.memory).toBe(1);
});
