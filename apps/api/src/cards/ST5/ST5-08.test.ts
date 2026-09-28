import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST5-08.js";

describe("ST5-08 DarkTyrannomon", () => {
  it("is fully represented as Blocker plus attack memory loss", () => {
    expect(runtimeCompiledCard("ST5-08")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
        { trigger: "WhenAttacking", actions: [{ kind: "GainMemory", amount: -2 }] },
      ],
    });
  });

  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST5-08", as: "darktyrannomon" }] },
      1: { security: ["ST5-03"] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("darktyrannomon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("darktyrannomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === -1 && s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

describe("ST5-08 DarkTyrannomon — KB Q&A rulings", () => {
  it("can attack with less than 2 memory and the attack finishes after memory moves to the opponent's side (Q664)", async () => {
    const atSecurityCheck: { memory: number; turnSeat: number }[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST5-08", as: "darktyrannomon" }], deck: ["ST5-03", "ST5-03"] },
        1: { security: ["ST5-03"], deck: ["ST5-03", "ST5-03"] },
      },
      {
        onEvent: () => {
          if (atSecurityCheck.length === 0 && s.state.players[1]!.security.length === 0) {
            atSecurityCheck.push({ memory: s.state.memory, turnSeat: s.state.turnSeat });
          }
        },
      },
    );
    void s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("darktyrannomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(atSecurityCheck).toEqual([{ memory: -1, turnSeat: 0 }]);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.memory).toBe(1);
  });
});
