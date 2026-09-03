import type { PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-098.js";

describe("BT7-098 Ultra Turbulence", () => {
  it("reduces an opposing Digimon and all opposing Security Digimon by 3000 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT7-031"], hand: [{ card: "BT7-098", as: "option" }] },
        1: {
          battleArea: [{ card: "BT7-043", as: "target", dp: 4000 }],
          security: [{ card: "BT7-043", as: "securityDigimon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
    expect(observe(s.engine).securityDp(1)).toBe(-3000);
  });

  it("applies the reduction in a live Security battle and expires at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-031", as: "attacker", dp: 2000 }],
          hand: [{ card: "BT7-098", as: "option" }],
          deck: ["BT7-001"],
        },
        1: {
          battleArea: [{ card: "BT7-043", as: "target", dp: 4000 }],
          security: ["BT1-009"],
          deck: ["BT7-001"],
        },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).securityDp(1) === -3000);

    const attacker = s.perm("attacker");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.security.length === 0);

    // BT1-009 is a 3000-DP Security Digimon. Ultra Turbulence lowers it to 0,
    // so the 2000-DP attacker survives the production security-battle resolver.
    expect(p0.battleArea.some((permanent) => permanent.permanentId === attacker.permanentId)).toBe(true);
    assertNoLoudGap(s);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });
});
