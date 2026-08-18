import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-100.js";

describe("BT11-100 Megalo Spark", () => {
  it("costs 1 less with a yellow Tamer and applies -8000 DP to exactly 1 opponent Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-089"], hand: [{ card: "BT11-100", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-081", as: "target", dp: 10000 },
            { card: "BT1-081", as: "other", dp: 10000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").permanentId);
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.state.memory).toBe(1); // printed cost 5, reduced to 4
    expect(s.perm("other").currentDP).toBe(10000);
  });
});
