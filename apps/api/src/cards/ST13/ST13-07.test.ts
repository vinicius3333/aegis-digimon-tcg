import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-07.js";

describe("ST13-07 Kotemon", () => {
  it("registers complete residual-free vanilla IR", () => {
    expect(runtimeCompiledCard("ST13-07")).toEqual({ effects: [], coverage: "full", residual: [] });
  });

  it("plays for 2 memory as a 3000-DP Digimon without activating an effect", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST13-07", as: "kotemon" }] } });
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kotemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({
      baseDP: 3000,
      currentDP: 3000,
      topCard: { cardId: "ST13-07" },
    });
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
