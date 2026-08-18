import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-095.js";
describe("BT1-095 Brave Shield", () => {
  it("unsuspends the chosen Digimon and gives that Digimon Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "chosen", suspended: true }, { card: "BT1-011", as: "other", suspended: true }], hand: [{ card: "BT1-095", as: "option" }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() =>
      observe(s.engine).hasKeyword(s.perm("chosen"), "Blocker") &&
      [...s.perm("chosen").keywords].includes("Blocker")
    );
    expect(s.perm("chosen").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    expect([...s.perm("chosen").keywords]).toContain("Blocker");
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
  });

  it("unsuspends one Digimon and grants it Blocker from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-095", as: "securityOption", faceUp: true }], battleArea: [{ card: "BT1-010", as: "target", suspended: true }, { card: "BT1-011", as: "other", suspended: true }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect([...s.perm("target").keywords]).toContain("Blocker");
    expect(s.perm("other").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
  });
});
