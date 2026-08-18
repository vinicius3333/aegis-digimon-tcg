import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-078.js";
describe("BT9-078 DexDoruGreymon", () => {
  it("deletes a level 4 Digimon when evolving over DoruGreymon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-064", as: "base" }], hand: [{ card: "BT9-078", as: "evolving" }, { card: "BT9-075", as: "cost" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
