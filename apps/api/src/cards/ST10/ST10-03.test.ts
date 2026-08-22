import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";

describe("ST10-03 Lopmon", () => {
  it("registers its catalog-defined vanilla behavior through compiled IR", () => {
    expect(hasRegisteredCompiledCard("ST10-03")).toBe(true);
  });

  it("plays as the catalog-defined vanilla yellow Rookie", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST10-03", as: "lopmon" }] },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea[0]).toMatchObject({
      baseDP: 4000,
      currentDP: 4000,
      topCard: { cardId: "ST10-03" },
    });
  });
});
