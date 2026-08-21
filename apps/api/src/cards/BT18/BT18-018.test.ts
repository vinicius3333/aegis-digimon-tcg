import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-018.js";

describe("BT18-018 EmperorGreymon", () => {
  it("gains Security Attack +1 and unsuspends once when it wins a battle", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "TrashDigivolution", scaling: { unit: "digivolutionCardColors" } }, { kind: "Suspend", scaling: { unit: "digivolutionCardColors" } }, { kind: "Attack" }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle" }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-018", as: "emperor", under: ["BT1-030"], suspended: true }] } });
    await s.ready();
    const emperorId = s.perm("emperor").permanentId;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: emperorId });
    expect(s.perm("emperor").isSuspended).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("emperor"), "SecurityAttack")).toBe(1);
  });
});
