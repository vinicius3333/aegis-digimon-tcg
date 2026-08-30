import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-032.js";

describe("BT2-032 UlforceVeedramon", () => {
  it("unsuspends when one of its controller's blue Tamers becomes suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true },
          { card: "BT1-086", as: "tamer" },
        ],
      },
    });

    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);

    expect(s.perm("ulforce").isSuspended).toBe(false);
  });

  it("gains 1 memory when it actually becomes unsuspended during its controller's main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);

    expect(s.state.memory).toBe(1);
  });

  it("Q1007 does not react to a non-blue Tamer or an opponent's blue Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true },
          { card: "BT1-085", as: "redTamer" },
        ],
      },
      1: { battleArea: [{ card: "BT1-086", as: "opposingBlueTamer" }] },
    });

    await advance(s.engine).verb.suspend([s.perm("redTamer").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("opposingBlueTamer").permanentId]);

    expect(s.perm("ulforce").isSuspended).toBe(true);
  });

  it("Q1008 gains no memory when an already active copy is targeted by unsuspend", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-032", as: "ulforce", under: ["BT2-027"] }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);

    expect(s.state.memory).toBe(0);
  });

  it("gains memory only once per turn even if it becomes unsuspended twice", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("ulforce").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);

    expect(s.state.memory).toBe(1);
  });

  it("gains no memory when unsuspended outside its controller's main phase", async () => {
    const activePhase = setupEngine({
      0: { battleArea: [{ card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true }] },
    });
    activePhase.state.memory = 0;
    activePhase.state.phase = Phase.Active;
    await advance(activePhase.engine).verb.unsuspend([activePhase.perm("ulforce").permanentId]);
    expect(activePhase.state.memory).toBe(0);

    const opponentTurn = setupEngine({
      0: { battleArea: [{ card: "BT2-032", as: "ulforce", under: ["BT2-027"], suspended: true }] },
    });
    opponentTurn.state.memory = 0;
    opponentTurn.state.turnSeat = 1;
    await advance(opponentTurn.engine).verb.unsuspend([opponentTurn.perm("ulforce").permanentId]);
    expect(opponentTurn.state.memory).toBe(0);
  });
});
