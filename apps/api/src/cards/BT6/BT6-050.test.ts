import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-050.js";

describe("BT6-050 Petaldramon", () => {
  it("digivolves onto a green Tamer and has Piercing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-088", as: "tamer" }],
        hand: [{ card: "BT6-050", as: "petaldramon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tamer").permanentId,
        instanceId: s.inst("petaldramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT6-050" && s.state.memory === 0);
    await s.engine.recomputeContinuousEffects();

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasPierce(s.perm("tamer"))).toBe(true);
  });

  it("does not use its Green-Tamer Hybrid evolution on a non-green Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-085", as: "redTamer" }],
        hand: [{ card: "BT6-050", as: "petaldramon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redTamer").permanentId,
        instanceId: s.inst("petaldramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("redTamer").topCard.cardId).toBe("BT1-085");
  });
});
