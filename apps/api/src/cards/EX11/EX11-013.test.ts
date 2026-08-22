import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-013.js";

describe("EX11-013 Sangomon", () => {
  it("draws on play when the hand has seven or fewer cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX11-013", as: "sangomon" }], deck: ["BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sangomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001"), 600);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("encodes both entry timings, the exact seven-card boundary, and inherited once-per-turn memory", () => {
    const compiled = runtimeCompiledCard("EX11-013")!;
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "zoneCount", op: "lte", value: 7 } }],
      });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "GainMemory", amount: 1 }],
    }));
  });
});
