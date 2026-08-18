import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-079.js";

describe("BT9-079 GranDracmon", () => {
  it("plays a purple level-3 Digimon from trash for free", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-012", as: "base" }], hand: [{ card: "BT9-079", as: "evolving" }], trash: [{ card: "BT9-070", as: "played" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(permanent => permanent.topCard?.instanceId === s.inst("played").instanceId));
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
