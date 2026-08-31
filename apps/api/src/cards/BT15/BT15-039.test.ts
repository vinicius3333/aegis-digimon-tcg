import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-039.js";

describe("BT15-039", () => {
  it("gives one opposing Digimon -3000 DP and makes it lose 1 memory on deletion", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "onDeletionOf",
      gainedActions: [{ kind: "GainMemory", amount: -1 }],
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      duration: "untilOpponentTurnEnd",
      target: { sameTarget: true },
    });
  });

  it("binds DP loss and deletion memory loss to the same opponent on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-039", as: "bomber" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 3000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bomber").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 2, 1_500);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // Memory is stored relative to the active (seat 0) player. The opponent's loss of 1
    // therefore moves the shared gauge from 1 (after Bombermon's play cost) to 2.
    expect(s.state.memory).toBe(2);
  });
  it("grants Gammamon-related effects on all turns and inherited all turns", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "GrantStatic", grant: "effects", excludeInherited: true }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "GrantStatic", grant: "effects", excludeInherited: true }],
    });
  });

  it("does not borrow an inherited Gammamon effect (KB Q2523)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-039", as: "bomber", under: ["BT8-008"] }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "firstTarget" },
            { card: "BT1-009", dp: 3000, as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bomber").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The physically inherited BT8-008 effect deletes one target. Excluding inherited
    // effects from Bombermon's borrowed copy prevents a second activation deleting both.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
