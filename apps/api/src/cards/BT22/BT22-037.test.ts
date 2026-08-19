import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import "../index.js";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import module from "./BT22-037.js";

describe("BT22-037 Chirinmon", () => {
  it("executes its effect-driven security-trash trigger and gives exactly -8000 DP", async () => {
    const s = setupEngine(
      {
        0: { security: ["BT22-037"] },
        1: { battleArea: [{ card: "BT1-028", as: "victim", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.perm("victim").currentDP === 2000, 120);

    expect(s.perm("victim").currentDP).toBe(2000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT22-037")).toBe(true);
    assertNoLoudGap(s);
  });

  it("keeps its When Digivolving and inherited clauses executable in the direct module", () => {
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, {} as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnUseAttack, {} as never)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnDiscardSecurity, {} as never)).toHaveLength(1);
  });
});
