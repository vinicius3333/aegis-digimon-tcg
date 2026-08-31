import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-047.js";
import "./BT5-051.js";

describe("BT5-051 MoriShellmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-051", as: "moriShellmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("moriShellmon").baseDP).toBe(7000);
    expect(s.perm("moriShellmon").currentDP).toBe(7000);
  });

  it("can legally evolve from a green level 3 into the vanilla level 4", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-047", as: "base" }], hand: [{ card: "BT5-051", as: "evolving" }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-051");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT5-047"]);
    expect(s.perm("base").topCard.cardId).toBe("BT5-051");
  });

  it("is registered with complete, residual-free runtime coverage", () => {
    expect(getEffectModule("BT5-051")).toBeDefined();
    expect(runtimeCompiledCard("BT5-051")).toMatchObject({ coverage: "full", residual: [] });
  });
});
