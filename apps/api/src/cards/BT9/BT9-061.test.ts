import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-061.js";

describe("BT9-061 Monochromon", () => {
  it("has Blocker and loses 3 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-061", as: "monochromon" }] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 4;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("monochromon"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("monochromon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
