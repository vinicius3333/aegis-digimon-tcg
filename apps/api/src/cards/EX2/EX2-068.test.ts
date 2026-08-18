import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-068.js";

describe("EX2-068 High-Speed Plug-In D", () => {
  it("gives one Digimon Jamming for the turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-014", as: "target" }, "EX2-060"], hand: [{ card: "EX2-068", as: "option" }] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "Jamming") && observe(s.engine).isRestricted(s.perm("target"), "cantBeBlocked"));
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Jamming")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantBeBlocked")).toBe(true);
    assertNoLoudGap(s);
  });
});
