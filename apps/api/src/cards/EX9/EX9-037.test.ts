import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-037.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-037", () => {
  it("suspends an opposing Digimon and prevents that same target from unsuspending in their next unsuspend phase", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", cost: { kind: "place", target: { filter: { zone: "hand" } } } },
          {
            kind: "Restrict",
            restriction: "unsuspendDuringOwnUnsuspendPhase",
            duration: "untilOpponentNextUnsuspendPhase",
            target: { sameTarget: true },
          },
        ],
      });
  });
  it("inherits once-per-turn suspension when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend", target: { filter: { controller: "opponent" } } }],
    }));

  it("places any hand card face-down but does not prevent effect-driven unsuspend", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-037", as: "source" }], hand: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: false }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("source").stack.map((card) => card.faceUp)).toEqual([false]);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("opponent").permanentId]);
    expect(s.perm("opponent").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("opponent").permanentId]);
    expect(s.perm("opponent").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still restricts an already-suspended target when the suspend step cannot change it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-037", as: "source" }], hand: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("retains a restriction granted after the opponent's unsuspend phase until their next one", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-037", as: "source" }], hand: ["BT1-001"], deck: ["BT1-009", "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const currentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    // Open the On Play window after this turn's unsuspend procedure has finished.
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    advance(s.engine).endMainPhaseIfOpen(1);
    await currentTurn;
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
