import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-073.js";

describe("EX11-073 ExMaquinamon", () => {
  it("has Security Attack +1 and Blocker while on the field", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-073", as: "exmaquinamon" }] } });
    await s.engine.recomputeContinuousEffects();
    await settle(() => observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "SecurityAttack"));
    expect(observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "Blocker")).toBe(true);
  });
});
