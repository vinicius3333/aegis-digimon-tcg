import type { GameState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-007.js";
import "../BT1/BT1-085.js";
import "../BT2/BT2-018.js";

describe("BT6-007 Agumon", () => {
  it("gains 1 memory when you play a Tai Kamiya Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-007", as: "agumon" }], hand: [{ card: "BT1-085", as: "tai" }] },
    });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tai").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("grants Security Attack +1 while inherited by Agumon - Bond of Bravery", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-018", under: ["BT6-007"], as: "bond" }] } });
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("bond"), "SecurityAttack")).toBe(1);
  });
});

describe("BT6-007 Agumon — KB Q&A rulings", () => {
  async function playTaiWithAgumons(agumonCount: number) {
    const s = setupEngine({
      0: {
        battleArea: Array.from({ length: agumonCount }, () => "BT6-007"),
        hand: [{ card: "BT1-085", as: "tai" }],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tai").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === agumonCount);
    await settle();
    return s;
  }

  it("gains 2 memory in total when 2 Agumon see the same Tai Kamiya play (Q1402)", async () => {
    const both = await playTaiWithAgumons(2);
    expect(both.state.memory).toBe(2);

    const single = await playTaiWithAgumons(1);
    expect(single.state.memory).toBe(1);
  });

  it("does not switch the turn until the attack that played Tai from security finishes (Q1403)", async () => {
    const observed: { kind: string; memory: number; turnSeat: number }[] = [];
    let state: GameState | undefined;
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-018", as: "attacker" }],
          deck: ["BT1-010", "BT1-010"],
          security: ["BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT6-007", as: "agumon" }],
          deck: ["BT1-010", "BT1-010"],
          security: [{ card: "BT1-085", as: "tai" }, { card: "BT1-010", as: "secondCheck" }, "BT1-010"],
        },
      },
      {
        onEvent: (event) => {
          if (state) observed.push({ kind: event.kind, memory: state.memory, turnSeat: state.turnSeat });
        },
      },
    );
    state = s.state;
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 0;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("tai").topCard?.cardId).toBe("BT1-085");
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondCheck").instanceId);

    const checks = observed.filter(({ kind }) => kind === "securityChecked");
    expect(checks).toHaveLength(2);
    expect(checks[1]).toEqual({ kind: "securityChecked", memory: -1, turnSeat: 0 });

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    const secondCheckIndex = observed.lastIndexOf(checks[1]!);
    const turnEndIndex = observed.findIndex(({ kind }) => kind === "turnEnded");
    expect(turnEndIndex).toBeGreaterThan(secondCheckIndex);
  });
});
