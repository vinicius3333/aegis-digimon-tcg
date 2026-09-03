import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-070.js";
import "./EX1-039.js";

describe("EX1-039 Lillymon", () => {
  it("grants Security Attack +1 from a public suspension and performs two security checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-042", as: "host", under: ["EX1-039"] }],
          hand: [{ card: "BT1-070", as: "suspender" }],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "opponent" }],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.perm("opponent").isSuspended && observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1,
    );
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("triggers only once per turn and expires when the public turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-042", as: "host", under: ["EX1-039"] }],
          hand: [
            { card: "BT1-070", as: "firstSuspender" },
            { card: "BT1-070", as: "secondSuspender" },
          ],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-070", as: "opponentOne" },
            { card: "BT1-070", as: "opponentTwo" },
          ],
          hand: ["BT1-001"],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("opponentOne").isSuspended && observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1,
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponentTwo").isSuspended);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger from an opponent-turn suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-042", as: "host", under: ["EX1-039"] },
            { card: "BT1-070", as: "target" },
          ],
          hand: ["BT1-001"],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "opponent" }],
          hand: [{ card: "BT1-070", as: "suspender" }],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
