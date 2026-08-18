import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST8-04.js";
import "./ST8-01.js";
import "./ST8-02.js";
import "./ST8-05.js";
import "./ST8-08.js";
import "./ST8-10.js";

describe("ST8 mixed UlforceVeedramon line", () => {
  it("can resolve Veemon's draw before UlforceVeedramon's 8-card unsuspend gate", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST8-10", as: "ulforce", under: ["ST8-04"] }],
        hand: Array.from({ length: 7 }, () => "ST8-02"),
        deck: [{ card: "ST8-03", as: "drawn" }],
      },
      1: { security: ["ST8-01", "ST8-01"] },
    }, { autoOrderTriggers: true });
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("ulforce").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId) &&
      !s.perm("ulforce").isSuspended,
    );

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.perm("ulforce").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not enable Veemon's alternate evolution against only a level 5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST8-04", as: "veemon" }],
        hand: [{ card: "ST8-10", as: "ulforce" }],
      },
      1: { battleArea: ["ST8-08"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("veemon").permanentId,
      instanceId: s.inst("ulforce").instanceId,
    })).toEqual({ ok: false, reason: "invalid-evolution" });
    assertNoLoudGap(s);
  });

  it("turns every 8-card inherited gate on after Veemon draws during the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "ST8-10",
              as: "ulforce",
              under: ["ST8-01", "ST8-02", "ST8-05", "ST8-08", "ST8-04"],
            },
          ],
          hand: Array.from({ length: 7 }, () => "ST8-02"),
          deck: [{ card: "ST8-03", as: "drawn" }],
        },
        1: {
          battleArea: [{ card: "ST8-04", as: "returned" }],
          security: ["ST8-01", "ST8-01", "ST8-01"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();
    const returnedInstanceId = s.perm("returned").topCard!.instanceId;
    expect(s.perm("ulforce").currentDP).toBe(12000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ulforce").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.length === 8 &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.security.length === 1 &&
        !s.perm("ulforce").isSuspended &&
        s.perm("ulforce").currentDP === 14000,
      3000,
    );

    expect(s.perm("ulforce").currentDP).toBe(14000);
    expect(s.state.players[1]!.hand.some(({ instanceId }) => instanceId === returnedInstanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("ulforce").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it.each([
    ["ST8-01", "your-turn"],
    ["ST8-02", "all-turns"],
  ] as const)("re-evaluates %s's %s DP gate immediately after drawing the eighth card", async (source, _label) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST8-10", as: "ulforce", under: [source, "ST8-04"] }],
          hand: Array.from({ length: 7 }, () => "ST8-03"),
          deck: [{ card: "ST8-03", as: "drawn" }],
        },
        1: { security: ["ST8-03"] },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(s.perm("ulforce").currentDP).toBe(12000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ulforce").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.hand.length === 8 && s.perm("ulforce").currentDP === 13000,
      3000,
    );

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.perm("ulforce").currentDP).toBe(13000);
    assertNoLoudGap(s);
  });
});
