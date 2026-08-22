import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-076.js";

describe("BT5-076 BlackGrowlmon", () => {
  it("gives its host Security Attack +1 when another own Digimon is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-079", as: "host", under: ["BT5-076"] }, { card: "BT5-071", as: "other" }, { card: "BT5-071", as: "second" }] }, 1: { battleArea: [{ card: "BT5-071", as: "opponent" }] } });
    await s.engine.recomputeContinuousEffects();
    await (s.engine as any).primitives.deletePermanent([s.perm("other").permanentId], "byEffect");
    await settle(() => observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    await (s.engine as any).primitives.deletePermanent([s.perm("opponent").permanentId], "byEffect");
    await (s.engine as any).primitives.deletePermanent([s.perm("second").permanentId], "byEffect");
    await settle();
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
  });
});
