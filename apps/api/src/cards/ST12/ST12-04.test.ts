import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST12-04 Huckmon", () => {
  it("gains 1 memory when a Sistermon is played and grants its Huckmon host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-04", as: "huckmon" }, { card: "ST12-06", as: "host", under: ["ST12-04"] }], hand: [{ card: "ST12-12", as: "sister" }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sister").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("gains memory only once per turn across multiple Sistermon plays", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST12-04", as: "huckmon" }], hand: [{ card: "ST12-13", as: "first" }, { card: "ST12-13", as: "second" }] } },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.memory === 7);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(3);
  });
});
