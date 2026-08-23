import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-089.js";

describe("BT6-089 T.K. Takaishi", () => {
  it("may suspend when a yellow Digimon attacks to give an opponent Digimon -1000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-089", as: "tk" },
            { card: "BT6-033", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT6-075", as: "target" }], security: ["BT6-074"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("target").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tk").isSuspended && s.perm("target").currentDP === baseDP - 1000);

    expect(s.perm("target").currentDP).toBe(baseDP - 1000);
  });

  it("gains 2 memory at turn start when you have less security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-089", as: "tk" }], security: 2 }, 1: { security: 3 } });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tk"));

    expect(s.state.memory).toBe(2);
  });
});
