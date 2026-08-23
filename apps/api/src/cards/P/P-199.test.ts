import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("P-199 Dan Yuki", () => {
  it("suspends itself and reduces the next TS Digimon play by exactly 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-199", as: "dan" }],
          hand: [{ card: "BT24-019", as: "ts" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 6;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("dan"));

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ts").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("dan").isSuspended &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-019") &&
        s.state.memory === 4,
    );

    expect(s.perm("dan").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT24-019")).toBe(true);
    assertNoLoudGap(s);
  });

  it("gives one of your Digimon +3000 DP when you have 4 or less memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-199", as: "dan" },
          { card: "BT1-009", as: "digimon", dp: 3000 },
        ],
      },
    });
    s.state.memory = 4;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("dan"));
    await settle(() => s.perm("digimon").currentDP === 6000);
    expect(s.perm("digimon").currentDP).toBe(6000);
    assertNoLoudGap(s);
  });

  it("plays itself for free from Security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-199", as: "securityDan" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const result = s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-199"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-199")).toBe(true);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
