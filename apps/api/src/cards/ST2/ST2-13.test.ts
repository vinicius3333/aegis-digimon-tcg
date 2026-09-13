import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
    const s = setupEngine({
      0: { security: [{ card: "ST2-13", as: "securityOption" }] },
      1: { battleArea: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.memory).toBe(-2);
  });
});
