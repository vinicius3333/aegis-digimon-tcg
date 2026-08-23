import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-12.js";

describe("ST13-12 Knightmon", () => {
  it("registers complete residual-free vanilla IR", () => {
    expect(runtimeCompiledCard("ST13-12")).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 5 memory as a 7000-DP dual-color Digimon without activating an effect", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST13-12", as: "knightmon" }] } });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({
      baseDP: 7000,
      currentDP: 7000,
      topCard: { cardId: "ST13-12" },
    });
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
