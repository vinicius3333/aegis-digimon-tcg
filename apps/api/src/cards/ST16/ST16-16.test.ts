import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-16.js";
describe("ST16-16 Baldy Blow", () => {
  it("deletes an opposing level 5 or lower Digimon", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST16-16", as: "card" }] }, 1: { battleArea: [{ card: "ST16-05", as: "target" }] } });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets", 1000);
    const d = s.state.pendingDecision!; expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: d.decisionId, response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 1500);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
