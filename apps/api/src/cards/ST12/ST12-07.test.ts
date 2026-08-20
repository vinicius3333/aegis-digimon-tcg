import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("ST12-07 SkullMeramon", () => {
  it("plays with its printed cost and DP", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST12-07", as: "skullmeramon" }] } });
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("skullmeramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 9000, currentDP: 9000 });
  });

  it("digivolves from a red level 4 for 3 memory", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST12-05", as: "base" }], hand: [{ card: "ST12-07", as: "skullmeramon" }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("skullmeramon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("skullmeramon").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
