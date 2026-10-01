import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST4-08.js";

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

describe("ST4-08 Kabuterimon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST4-08", as: "kabuterimon" }] }, 1: { security: ["ST4-03"] } });
    s.state.memory = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("kabuterimon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === -1 && s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});

describe("ST4-08 Kabuterimon — KB Q&A rulings", () => {
  it("can attack with less than 2 memory and the turn only ends after the attack (Q651)", async () => {
    const boardAtSecurityCheck: { turnSeat: number; phase: string; memory: number }[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST4-08", as: "kabuterimon" }], deck: [...FILLER], security: ["ST4-03"] },
        1: { deck: [...FILLER], security: ["ST4-03", "ST4-03"] },
      },
      {
        onEvent: (event) => {
          if (event.kind === "securityChecked") {
            boardAtSecurityCheck.push({ turnSeat: s.state.turnSeat, phase: s.state.phase, memory: s.state.memory });
          }
        },
      },
    );
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await turn;

    expect(boardAtSecurityCheck).toEqual([{ turnSeat: 0, phase: Phase.Main, memory: -1 }]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.findIndex(({ kind }) => kind === "turnEnded")).toBeGreaterThan(
      s.events.findIndex(({ kind }) => kind === "securityChecked"),
    );
  });
});
