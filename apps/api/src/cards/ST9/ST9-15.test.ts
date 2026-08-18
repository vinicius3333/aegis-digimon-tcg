import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST9-15.js";

describe("ST9-15 Hell Masquerade", () => {
  it("grants +2000 DP and Piercing while a blue Digimon is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST9-02", as: "blue" }, { card: "ST9-07", as: "target" }], hand: [{ card: "ST9-15", as: "option" }] } });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const dpDecision = s.decisions.at(-1)!.req;
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: dpDecision.decisionId, response: { kind: "chooseTargets", instanceIds: [s.perm("blue").permanentId] } })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets" && s.decisions.length >= 2);
    const piercingDecision = s.decisions.at(-1)!.req;
    expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: piercingDecision.decisionId, response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] } })).toEqual({ ok: true });
    await settle(() => s.perm("blue").currentDP === s.perm("blue").baseDP + 2000 && observe(s.engine).hasPierce(s.perm("target")));
    expect(s.perm("blue").currentDP).toBe(s.perm("blue").baseDP + 2000);
    expect(observe(s.engine).hasPierce(s.perm("blue"))).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(true);
  });
});
