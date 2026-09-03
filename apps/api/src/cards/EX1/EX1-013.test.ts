import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-013.js";

describe("EX1-013 Veemon", () => {
  it("gains 1 memory when its host becomes unsuspended during your main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-019", as: "host", suspended: true, under: ["EX1-013", "BT1-032"] }] },
    });
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await settle(() => s.state.memory === 6);
    expect(s.state.memory).toBe(6);
  });

  it("does not trigger during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-019", as: "host", suspended: true, under: ["EX1-013", "BT1-032"] }], deck: [] },
      1: { battleArea: [{ card: "BT1-070", as: "opponent" }], deck: ["BT1-001"] },
    });
    s.state.memory = 5;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    const memoryBefore = s.state.memory;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await loop;
  });

  it("does not trigger when an already-unsuspended Digimon is targeted (Q3203)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-019", as: "host", under: ["EX1-013", "BT1-032"] }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("host").isSuspended).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.memory).toBe(5);
  });

  it("fires only once per turn after two genuine unsuspends", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-019", as: "host", suspended: true, under: ["EX1-013", "BT1-032"] }] },
    });
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(6);
  });
});
