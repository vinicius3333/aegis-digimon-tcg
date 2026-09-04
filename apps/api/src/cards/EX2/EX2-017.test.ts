import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-017.js";
import "./EX2-059.js";

describe("EX2-017 Leomon", () => {
  it("gains 2 memory and draws 1 when deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-017", as: "leomon" }], deck: [{ card: "BT1-001", as: "drawn" }] },
        1: { battleArea: [{ card: "EX2-014", as: "defender", suspended: true }] },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 5 && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("has Blocker only during the opponent's turn while a Tamer is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-017", as: "leomon" },
          { card: "EX2-059", as: "tamer" },
        ],
        deck: ["BT1-001"],
      },
      1: { hand: ["BT1-009"], deck: ["BT1-001"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("leomon"), "Blocker")).toBe(false);

    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("leomon"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("does not gain Blocker during the opponent's turn without a Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-017", as: "leomon" }] },
      1: { deck: ["BT1-001"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("leomon"), "Blocker")).toBe(false);
  });
});
