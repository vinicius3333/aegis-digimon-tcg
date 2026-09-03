import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-026.js";
import "./EX2-027.js";
import "../ST4/ST4-15.js";

describe("EX2-026 Gargomon", () => {
  it("reduces its digivolution cost by 1 with a green Tamer in play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-026", as: "base" }, "EX2-061"], hand: [{ card: "EX2-027", as: "evolution" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);
    expect(s.state.memory).toBe(8);
  });

  it("does not reduce the cost without a green Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-026", as: "base" }, "EX2-060"], hand: [{ card: "EX2-027", as: "evolution" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 7);
    expect(s.state.memory).toBe(7);
  });

  it("gains inherited DP when an opponent's Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-027", as: "host", under: ["EX2-026"] }],
          hand: [
            { card: "ST4-15", as: "option1" },
            { card: "ST4-15", as: "option2" },
          ],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "target1" },
            { card: "EX2-014", as: "target2" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").currentDP === 9000);
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target2").isSuspended);
    expect(s.perm("host").currentDP).toBe(9000);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
