import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";
import { compiled } from "./EX10-002.js";

describe("EX10-002 Koromon inherited attack-target switch", () => {
  it("draws once when an attack target changes, then observes once-per-turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX10-002", as: "koromon" }] }],
        deck: ["BT1-009", "BT1-009"],
      },
    });
    const p0 = s.state.players[0]!;
    await s.engine.recomputeContinuousEffects();
    const handBefore = p0.hand.length;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => p0.hand.length === handBefore + 1);
    expect(p0.hand.length).toBe(handBefore + 1);

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => false, 30);
    expect(p0.hand.length).toBe(handBefore + 1);
  });

  it("is an unscoped [All Turns] watcher: it also fires on the opponent's turn and for their switch", async () => {
    // The printed clause is "When attack targets change", with no "this Digimon's" qualifier,
    // so the watcher carries no sourceFilter and reacts to either player's switch. FAILS-WHEN-
    // REVERTED: narrowing the effect to YourTurn, or adding sourceFilter { isSelfRef: true },
    // makes this draw never happen.
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX10-002", as: "koromon" }] }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "enemy" }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const p0 = s.state.players[0]!;
    const handBefore = p0.hand.length;
    const enemyHandBefore = s.state.players[1]!.hand.length;

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      subjectPermanentId: s.perm("enemy").permanentId,
      attackerPermanentId: s.perm("enemy").permanentId,
    });
    await settle(() => p0.hand.length === handBefore + 1);

    // The draw belongs to the host's controller, not to the player who switched.
    expect(p0.hand.length).toBe(handBefore + 1);
    expect(s.state.players[1]!.hand.length).toBe(enemyHandBefore);
  });

  it("records the inherited [All Turns] once-per-turn contract", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
