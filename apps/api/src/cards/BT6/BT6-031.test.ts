import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-031.js";

describe("BT6-031 Tinkermon", () => {
  it("gives an opposing Digimon Security Attack -1 on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-031", as: "tinkermon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("tinkermon").permanentId], "byEffect");

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("keeps the debuff through your turn and expires at the opponent's turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-031", as: "tinkermon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }], deck: ["BT1-003"] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("tinkermon").permanentId], "byEffect");
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("lasts only until the end of that turn when activated on the opponent's turn (Q1420)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-031", as: "tinkermon", suspended: true }],
          hand: ["BT1-009"],
          deck: Array(10).fill("BT1-003"),
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], hand: ["BT1-009"], deck: Array(10).fill("BT1-003") },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const securityAttack = () => observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack");
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("tinkermon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 0 &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(securityAttack()).toBe(-1);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(securityAttack()).toBe(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
