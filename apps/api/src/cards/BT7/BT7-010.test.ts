import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-010.js";

describe("BT7-010 Tuskmon", () => {
  it("gives one of your Digimon +2000 DP for the turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "BT1-010", as: "target" },
          ],
          hand: [{ card: "BT7-010", as: "evolving" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    const before = s.perm("target").currentDP;
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === before + 2000);
    expect(s.perm("target").currentDP).toBe(before + 2000);
  });
});
