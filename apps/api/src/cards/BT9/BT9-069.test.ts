import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-069.js";

describe("BT9-069 Baihumon", () => {
  it("unsuspends up to 2 permanents and gains memory for every opposing unsuspended Digimon and Tamer", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-022", as: "base" }], hand: [{ card: "BT9-069", as: "evolving" }] }, 1: { battleArea: [{ card: "BT1-015", as: "digimon", suspended: true }, { card: "BT8-093", as: "tamer", suspended: true }, "BT1-016"] } }, { autoSelectCards: true, preferInstanceIds: preferred });
    preferred.push(s.perm("digimon").permanentId, s.perm("tamer").permanentId);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT9-069"));
    expect(s.state.players[1]!.battleArea.every(permanent => !permanent.isSuspended)).toBe(true);
    expect(s.state.memory).toBe(3);
  });
});
