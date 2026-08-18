import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-062.js";
describe("BT1-062 SlashAngemon", () => {
  it("gives an opposing Digimon -8000 DP when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-059", as: "base" }], hand: [{ card: "BT1-062", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-064", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
