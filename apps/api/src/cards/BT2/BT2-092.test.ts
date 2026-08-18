import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-092.js";

describe("BT2-092 Crimson Blaze", () => {
  it("gives up to two Digimon Security Attack +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-009", as: "first" }, { card: "BT2-010", as: "second" }, "BT2-011"], hand: [{ card: "BT2-092", as: "option" }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("first"), "SecurityAttack"));
    expect(observe(s.engine).hasKeyword(s.perm("first"), "SecurityAttack")).toBe(true);
  });
});
