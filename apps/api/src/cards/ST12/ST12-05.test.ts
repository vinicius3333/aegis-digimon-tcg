import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST12-05 Meramon", () => {
  it("plays with its printed cost and DP", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST12-05", as: "meramon" }] } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.perm("meramon")).toMatchObject({ baseDP: 4000, currentDP: 4000 });
  });

  it("digivolves from a red level 3 for 1 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-02", as: "base" }], hand: [{ card: "ST12-05", as: "meramon" }] } });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("meramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("meramon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
