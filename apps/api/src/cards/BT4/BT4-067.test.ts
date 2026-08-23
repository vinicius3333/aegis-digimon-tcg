import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-067.js";

describe("BT4-067 Sealsdramon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-067", as: "seals" }] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("seals"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seals").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
