import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-101.js";

describe("BT11-101 Holy Sunshine", () => {
  it("weakens exactly 3 opposing Digimon and grants Security Attack -1", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-089"], hand: [{ card: "BT11-101", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-081", as: "a", dp: 10000 },
            { card: "BT1-081", as: "b", dp: 10000 },
            { card: "BT1-081", as: "c", dp: 10000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => ["a", "b", "c"].every((alias) => s.perm(alias).currentDP === 5000));
    await settle(() => ["a", "b", "c"].every((alias) => observe(s.engine).keywordAmount(s.perm(alias), "SecurityAttack") === -1));
    for (const alias of ["a", "b", "c"]) {
      expect(observe(s.engine).keywordAmount(s.perm(alias), "SecurityAttack")).toBe(-1);
    }
  });
});
