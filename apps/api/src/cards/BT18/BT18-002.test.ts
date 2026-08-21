import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-002.js";

describe("BT18-002 Chapmon", () => {
  it("grants its host 1000 DP only while another blue Digimon is present", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "youHave", filter: { excludeSelf: true, kind: ["Digimon"], colors: ["Blue"] } } }],
    });

    const withAnother = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-002"] }, { card: "BT1-030", as: "other" }] } });
    await withAnother.engine.recomputeContinuousEffects();
    expect(withAnother.perm("host").currentDP).toBe(4000);

    const alone = setupEngine({ 0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-002"] }] } });
    await alone.engine.recomputeContinuousEffects();
    expect(alone.perm("host").currentDP).toBe(3000);
  });
});
