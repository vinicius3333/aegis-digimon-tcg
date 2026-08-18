import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-041.js";

describe("BT12-041 handwritten module", () => {
  it("registers its printed timing without declarative effect record", () => {
    const module = getEffectModule("BT12-041");
    expect(module?.cardId).toBe("BT12-041");
    const source = {
      instanceId: "source-041",
      cardId: "BT12-041",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThan(0);
  });
});

it("draws only when an opposing Digimon is deleted by a 0 DP rule check", async () => {
  const s = setupEngine({
    0: { battleArea: [{ card: "BT12-041", as: "cho" }], deck: ["BT1-009"] },
    1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 0 }] },
  });
  await s.ready();
  const handBefore = s.state.players[0]!.hand.length;
  await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byRule");
  await settle(() => s.state.players[0]!.hand.length > handBefore);
  expect(s.state.players[0]!.hand.length).toBe(handBefore + 1);
});
