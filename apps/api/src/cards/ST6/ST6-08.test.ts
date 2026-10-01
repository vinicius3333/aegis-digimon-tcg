import { Phase, type GameState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST6-08.js";

describe("ST6-08 Devimon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST6-08", as: "devimon" }], security: ["ST6-01"] },
      1: { security: ["ST6-01"] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("devimon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("devimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === -1 && s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses its printed Blocker in a real opponent attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST6-08", as: "devimon" }], security: ["ST6-01"] },
        1: { battleArea: [{ card: "ST6-02", as: "attacker" }], security: ["ST6-01"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("devimon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("devimon").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("ST6-08 Devimon — KB Q&A rulings", () => {
  it("can attack with less than 2 memory and the turn ends only after the attack finishes (Q672)", async () => {
    const observed: { kind: string; memory: number; phase: string; turnSeat: number }[] = [];
    let state: GameState | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST6-08", as: "devimon" }],
          hand: ["ST6-02"],
          deck: ["ST6-02", "ST6-02"],
          security: ["ST6-02"],
        },
        1: { deck: ["ST6-02"], security: ["ST6-02", "ST6-02"] },
      },
      {
        onEvent: (event) => {
          if (state) {
            observed.push({ kind: event.kind, memory: state.memory, phase: state.phase, turnSeat: state.turnSeat });
          }
        },
      },
    );
    state = s.state;
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("devimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await turn;

    const securityCheck = observed.findIndex(({ kind }) => kind === "securityChecked");
    const turnEnd = observed.findIndex(({ kind }) => kind === "turnEnded");
    expect(securityCheck).toBeGreaterThanOrEqual(0);
    expect(observed[securityCheck]).toEqual({ kind: "securityChecked", memory: -1, phase: Phase.Main, turnSeat: 0 });
    expect(turnEnd).toBeGreaterThan(securityCheck);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(-1);
  });
});
