import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

describe("GrantStatic duration ownership", () => {
  it("keeps BT21-057's opponent grant through the granter turn and clears at the opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-085", as: "tai" }],
          hand: [{ card: "BT21-057", as: "greymon" }, "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT21-015", as: "victim" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("victim")).length === 1);
    expect(observe(s.engine).customEffectGrants(s.perm("victim"))).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).customEffectGrants(s.perm("victim")).length).toBe(1);
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.perm("victim").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).customEffectGrants(s.perm("victim")).length).toBe(0);
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });
});
