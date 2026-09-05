import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-070.js";
import "../BT1/BT1-075.js";
import "./EX1-036.js";

describe("EX1-036 Togemon", () => {
  it("gives its host +2000 DP when a real opposing On Play effect suspends a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "host", under: ["BT1-064", "EX1-036"], dp: 5000 }],
          hand: [{ card: "BT1-070", as: "suspender" }],
        },
        1: { battleArea: [{ card: "BT1-070", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponent").isSuspended && s.perm("host").currentDP === 7000);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("ignores own suspension, triggers once per turn, and expires at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-075", as: "host", under: ["BT1-064", "EX1-036"], dp: 5000 },
            { card: "BT1-070", as: "ownTarget" },
          ],
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
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ownTarget").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ownTarget").isSuspended);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponentOne").isSuspended && s.perm("host").currentDP === 7000);
    expect(s.perm("host").currentDP).toBe(7000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondSuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponentTwo").isSuspended);
    expect(s.perm("host").currentDP).toBe(7000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger on an opponent-turn suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "host", under: ["BT1-064", "EX1-036"], dp: 5000 }],
          hand: ["BT1-001"],
          deck: ["BT1-001", "BT1-002"],
          security: ["BT1-001", "BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "opponentTarget" }],
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
    await settle(() => s.perm("opponentTarget").isSuspended);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
