import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST6-10.js";

describe("ST6-10 SkullSatamon", () => {
  it("returns a purple Digimon from trash when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST6-08", as: "base" }], hand: [{ card: "ST6-10", as: "evolving" }], trash: [{ card: "ST6-03", as: "returned" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returned").instanceId));
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
