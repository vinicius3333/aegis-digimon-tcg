import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-066.js";

describe("BT12-066 Mercurymon", () => {
  it("gives one of your Digimon Blocker when played", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT1-009", as: "ally" }], hand: [{ card: "BT12-066", as: "mercury" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mercury").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("ally"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Blocker")).toBe(true);
  });
});
