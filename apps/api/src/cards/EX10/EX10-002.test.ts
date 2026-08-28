import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

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
});
