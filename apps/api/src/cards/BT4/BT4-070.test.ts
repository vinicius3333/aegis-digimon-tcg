import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-070.js";

describe("BT4-070 Meteormon", () => {
  it("has Reboot without immediately unsuspending after an attack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-070", as: "meteor" }] } });
    const meteor = s.perm("meteor");
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(meteor, "Reboot")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: meteor.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    expect(meteor.isSuspended).toBe(true);
  });
});
