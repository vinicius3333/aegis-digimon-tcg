import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-020.js";

describe("EX1-020 Plesiomon", () => {
  it("can attack an opponent's unsuspended Digimon without digivolution cards on your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-020", as: "plesiomon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("plesiomon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plesiomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("draws 2 when an opponent's digivolution card is trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-020", as: "plesiomon" }],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", under: ["BT1-009"], as: "opponent" }] },
    });
    await s.ready();
    const before = s.state.players[0]!.hand.length;

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("opponent").permanentId,
      [s.perm("opponent").stack[0]!.instanceId],
      0,
    );

    expect(s.state.players[0]!.hand.length).toBe(before + 2);
  });

  it("does not draw when your own digivolution card is trashed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-020", as: "plesiomon" }, { card: "BT1-032", as: "own", under: ["BT1-030"] }], deck: ["BT1-009", "BT1-009"] },
    });
    await s.ready();
    const before = s.state.players[0]!.hand.length;
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("own").permanentId, [s.perm("own").stack[0]!.instanceId], 0);
    expect(s.state.players[0]!.hand.length).toBe(before);
  });

  it("draws only once when two opponent sources are trashed in one turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-020", as: "plesiomon" }], deck: ["BT1-009", "BT1-009", "BT1-010", "BT1-010"] },
      1: { battleArea: [{ card: "BT1-032", as: "opponent", under: ["BT1-030", "BT1-031"] }] },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("opponent").permanentId, [s.perm("opponent").stack[0]!.instanceId], 0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("opponent").permanentId, [s.perm("opponent").stack[0]!.instanceId], 0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("does not draw during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-020", as: "plesiomon" }], deck: [] },
      1: { battleArea: [{ card: "BT1-032", as: "opponent", under: ["BT1-030"] }], deck: ["BT1-001"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("opponent").permanentId, [s.perm("opponent").stack[0]!.instanceId], 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await loop;
  });
});
