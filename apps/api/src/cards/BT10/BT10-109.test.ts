import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-109.js";

describe("BT10-109 Reinforcement Plug-In O", () => {
  it("uses its Tamer color waiver and gives the chosen Digimon +3000 DP through the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-087", { card: "BT10-085", as: "chosen", dp: 4000 }],
          hand: [{ card: "BT10-109", as: "option" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("chosen").currentDP === 7000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("chosen").currentDP).toBe(7000);
  });

  it("Security gains 1 memory and returns itself to hand", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT10-109", as: "option", faceUp: true }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
