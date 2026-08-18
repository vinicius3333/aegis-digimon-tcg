import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-003.js";

describe("P-003 Gabumon", () => {
  it("trashes the bottom, rather than the top, digivolution card of the chosen opponent", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-003", as: "gabumon" }] }, 1: { battleArea: [{ card: "BT1-038", as: "target", under: [{ card: "BT1-009", as: "bottom" }, { card: "BT1-027", as: "top" }] }] } }, { autoSelectCards: true });
    const p1 = s.state.players[1]!;
    const target = s.perm("target");
    const bottom = s.inst("bottom").instanceId;
    const top = s.inst("top").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumon").instanceId })).toEqual({ ok: true });
    await settle(() => p1.trash.some((card) => card.instanceId === bottom));
    expect(p1.trash.some((card) => card.instanceId === bottom)).toBe(true);
    expect(target.stack.map((card) => card.instanceId)).toEqual([top]);
  });
});
