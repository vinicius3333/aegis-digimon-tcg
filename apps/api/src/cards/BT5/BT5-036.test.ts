import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-036.js";

describe("BT5-036 Renamon", () => {
  it("gives an opponent Digimon Security Attack -1 until their next turn ends", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT5-036", as: "source" }] }, 1: {
      battleArea: [{ card: "BT5-041", as: "target" }],
    } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(true);
  });
});
