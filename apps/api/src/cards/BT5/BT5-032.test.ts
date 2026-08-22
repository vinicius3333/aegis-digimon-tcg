import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-032.js";

describe("BT5-032 Hexeblaumon", () => {
  it("trashes 2 bottom sources and gains Jamming when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-032", as: "hexe" }] }, 1: { battleArea: [{ card: "BT4-073", as: "target", under: [{ card: "BT1-009", as: "bottom" }, { card: "BT1-010", as: "top" }] }], security: ["BT1-011"] } }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("hexe").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0 && observe(s.engine).hasKeyword(s.perm("hexe"), "Jamming"));

    expect(s.perm("target").stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("hexe"), "Jamming")).toBe(true);
  });

  it("prevents opposing Digimon without sources from attacking or blocking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-032", as: "hexe" }] }, 1: { battleArea: [{ card: "BT4-076", as: "opponent" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "block")).toBe(true);

    await (s.engine as any).primitives.deletePermanent([s.perm("hexe").permanentId], "byEffect");
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "block")).toBe(false);
  });

  it("does not gain Jamming when a source remains after trashing two", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-032", as: "hexe" }] }, 1: { battleArea: [{ card: "BT4-073", as: "target", under: ["BT1-009", "BT1-010", "BT1-011"] }], security: ["BT1-012"] } }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("hexe").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(observe(s.engine).hasKeyword(s.perm("hexe"), "Jamming")).toBe(false);
  });
});
