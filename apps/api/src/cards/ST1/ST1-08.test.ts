import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST1-08.js";

describe("ST1-08 Garudamon", () => {
  it("can choose itself for +3000 DP, leaves another ally unchanged, and expires at turn end (Q603)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST1-07", as: "base" },
            { card: "ST1-06", as: "ally" },
          ],
          hand: [{ card: "ST1-08", as: "garudamon" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("base").permanentId);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 10000);
    expect(s.perm("base").currentDP).toBe(10000);
    expect(s.perm("ally").currentDP).toBe(s.perm("ally").baseDP);

    await advance(s.engine).runTurn(0);
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP);
    assertNoLoudGap(s);
  });
});
