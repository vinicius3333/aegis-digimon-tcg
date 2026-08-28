import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-040.js";

describe("BT4-040 Diatrymon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-040", as: "diatrymon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("diatrymon").currentDP).toBe(s.perm("diatrymon").baseDP);
  });

  it("can legally digivolve from the assigned yellow level 3 card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-036", as: "base" }],
        hand: [{ card: "BT4-040", as: "diatrymon" }],
        deck: ["BT1-005"],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("diatrymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-040");

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard?.cardId).toBe("BT4-040");
  });
});
