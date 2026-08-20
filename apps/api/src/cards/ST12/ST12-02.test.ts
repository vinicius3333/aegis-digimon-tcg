import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST12-02 Candlemon", () => {
  it("plays with its printed cost and DP", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST12-02", as: "candlemon" }] } });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("candlemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.perm("candlemon")).toMatchObject({ baseDP: 3000, currentDP: 3000 });
  });

  it("digivolves from a red level 2 for 0 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-01", as: "egg" }], hand: [{ card: "ST12-02", as: "candlemon" }] } });
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("candlemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("candlemon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
