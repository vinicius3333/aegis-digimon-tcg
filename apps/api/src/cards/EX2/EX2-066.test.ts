import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-066.js";

describe("EX2-066 Offensive Plug-In A", () => {
  it("gives one Digimon Security Attack +1 for the turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX2-008", as: "target" }, "EX2-060"], hand: [{ card: "EX2-066", as: "option" }] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
  });
});
