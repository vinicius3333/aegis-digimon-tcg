import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-014.js";

describe("BT4-014 Vermilimon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-014", as: "vermilimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("vermilimon").currentDP).toBe(s.perm("vermilimon").baseDP);
  });

  it("can legally digivolve from a red level 4 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-012", as: "base" }],
        hand: [{ card: "BT4-014", as: "vermilimon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vermilimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-014");

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard?.cardId).toBe("BT4-014");
  });
});
