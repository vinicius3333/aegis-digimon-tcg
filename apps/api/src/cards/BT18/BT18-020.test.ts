import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-020.js";

describe("BT18-020 Syakomon", () => {
  it("keeps Aquatic as a rule trait through the engine", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"], target: { filter: { isSelfRef: true } } }] });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT18-020", as: "syakomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("syakomon"), "Aquatic")).toBe(true);
  });
});
