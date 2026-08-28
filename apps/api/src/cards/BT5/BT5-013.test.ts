import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-013.js";

describe("BT5-013 Triceramon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-013", as: "triceramon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("triceramon").currentDP).toBe(s.perm("triceramon").baseDP);
  });

  it("can legally evolve from a red level 4 into the vanilla level 5", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-012", as: "base" }], hand: [{ card: "BT5-013", as: "evolving" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-013");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT5-012"]);
    expect(s.perm("base").topCard.cardId).toBe("BT5-013");
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-013")).toBeDefined();
    expect(runtimeCompiledCard("BT5-013")).toMatchObject({ coverage: "full", residual: [] });
  });
});
