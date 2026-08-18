import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-009.js";
import "./BT9-011.js";

describe("BT9-011 Growlmon (X Antibody)", () => {
  it("adds 1000 to its host's maximum for DP-based deletion effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-001", as: "base", under: ["BT9-011"] }], hand: [{ card: "BT9-009", as: "evolving" }] }, 1: { battleArea: [{ card: "BT9-074", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
