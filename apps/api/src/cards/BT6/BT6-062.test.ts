import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-062.js";

describe("BT6-062 Volcanomon", () => {
  it("gives its host Security Attack +1 while an opposing Digimon is unsuspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-065", under: ["BT6-062"], as: "host" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);

    s.perm("opponent").isSuspended = true;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
  });
});
