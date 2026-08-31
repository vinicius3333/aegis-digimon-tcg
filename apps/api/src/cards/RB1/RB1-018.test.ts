import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-018 Monzaemon", () => {
  it("places Numemon from trash, gains memory, and debuffs one opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "RB1-018", as: "monzaemon" }], trash: ["RB1-017"] },
        1: { battleArea: [{ card: "RB1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monzaemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 5000);

    expect(s.state.memory).toBe(5);
    expect(s.perm("monzaemon").stack.some((card) => card.cardId === "RB1-017")).toBe(true);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("does not pay the memory reward when no Numemon card is available to place", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "RB1-018", as: "monzaemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monzaemon").instanceId })).toEqual({
      ok: true,
    });

    expect(s.state.memory).toBe(3);
    expect(s.perm("monzaemon").stack).toHaveLength(0);
  });
});
