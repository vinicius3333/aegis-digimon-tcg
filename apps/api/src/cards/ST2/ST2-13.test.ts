import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST2-13.js";

describe("ST2-13 Hammer Spark", () => {
  it("matches both printed memory effects in the complete IR artifact", () => {
    const definition = getCardDefinition("ST2-13")!;
    const compiled = getCompiledCard("ST2-13")!;

    expect(definition.kinds).toEqual(["Option"]);
    expect(definition.colors).toEqual(["Blue"]);
    expect(definition.playCost).toBe(0);
    expect(definition.effectText).toContain("Gain 1 memory");
    expect(definition.securityEffectText).toContain("Gain 2 memory");
    expect(compiled.effects).toEqual([
      { trigger: "Main", actions: [{ kind: "GainMemory", amount: 1 }] },
      { trigger: "Security", actions: [{ kind: "GainMemory", amount: 2 }], isSecurity: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gains 1 memory from Main", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST2-03"], hand: [{ card: "ST2-13", as: "option" }] } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("gains 2 memory from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "ST2-13", as: "securityOption", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.memory).toBe(2);
  });
});
