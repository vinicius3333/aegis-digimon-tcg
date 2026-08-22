import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-020.js";
import "../index.js";
describe("BT26-020 ShellNumemon", () => {
  it("compiles draw and same-target attack/block restriction plus inherited Evade", () => {
    expect(compiled.coverage).toBe("full"); expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]?.actions).toMatchObject([{ kind: "Draw" }, { kind: "Restrict", restriction: "attackOrBlock" }]);
    expect(compiled.effects[1]).toMatchObject({ trigger: "None", isInherited: true, actions: [{ kind: "GainKeyword", keyword: "Evade" }] });
  });
  it("draws and restricts exactly one opposing Digimon from attacking or blocking", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT26-020", as: "shell" }], deck: [{ card: "BT1-001", as: "drawn" }] }, 1: { battleArea: [{ card: "BT1-009", as: "first" }, { card: "BT1-010", as: "second" }] } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shell").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId));
    await settle(() => observe(s.engine).isRestricted(s.perm("first"), "attack") || observe(s.engine).isRestricted(s.perm("second"), "attack"));
    const locked = [s.perm("first"), s.perm("second")].filter((p) => observe(s.engine).isRestricted(p, "attack"));
    expect(locked).toHaveLength(1);
    expect(observe(s.engine).isRestricted(locked[0]!, "block")).toBe(true);
  });
});
