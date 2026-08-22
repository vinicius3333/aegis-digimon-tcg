import { describe, expect, it } from "vitest";
import { compiled } from "./ST18-05.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";

describe("ST18-05 Muchomon", () => {
  it("expires its effect-suspension bonus at the end of the opponent's turn", () => {
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [expect.objectContaining({
        kind: "SubTrigger",
        actions: [expect.objectContaining({
          kind: "ModifyDP",
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        })],
      })],
    }));
  });

  it("reacts to an effect suspending a Digimon, regardless of which player caused it", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST18-05", as: "muchomon" }, { card: "ST18-10", as: "vortexTarget" }] },
      1: { battleArea: [{ card: "ST18-03", as: "victim" }] },
    });
    const before = s.perm("vortexTarget").currentDP;
    await advance(s.engine).fireSubTrigger("whenEffectSuspends", {
      subjectPermanentId: s.perm("victim").permanentId,
      suspendedPermanentId: s.perm("victim").permanentId,
      effectSuspendSeat: 1,
    });
    await settle(() => s.perm("vortexTarget").currentDP === before + 3000);
    expect(s.perm("vortexTarget").currentDP).toBe(before + 3000);
  });
});
