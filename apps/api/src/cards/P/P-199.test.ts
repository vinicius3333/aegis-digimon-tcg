import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("P-199 Dan Yuki", () => {
  it("suspends itself and reduces the next TS Digimon play by exactly 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-199", as: "dan" }],
        hand: [{ card: "BT24-019", as: "ts" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    s.state.memory = 6;
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("dan"));

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ts").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dan").isSuspended);

    expect(s.perm("dan").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-019")).toBe(true);
    assertNoLoudGap(s);
  });
});
