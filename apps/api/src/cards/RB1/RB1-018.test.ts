import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-018 Monzaemon", () => {
  it("places Numemon from trash, gains memory, and debuffs one opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-018", as: "monzaemon" }], trash: ["RB1-017"] },
        1: { battleArea: [{ card: "RB1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("monzaemon"));
    await settle(() => s.perm("target").currentDP === 5000);

    expect(s.state.memory).toBe(2);
    expect(s.perm("monzaemon").stack.some((card) => card.cardId === "RB1-017")).toBe(true);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("does not pay the memory reward when no Numemon card is available to place", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "RB1-018", as: "monzaemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("monzaemon"));

    expect(s.state.memory).toBe(0);
    expect(s.perm("monzaemon").stack).toHaveLength(0);
  });
});
