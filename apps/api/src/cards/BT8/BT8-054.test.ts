import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-054.js";

describe("BT8-054 Pistmon", () => {
  it("suspends one of your Digimon to reduce its digivolution cost by 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-053", as: "base" },
            { card: "BT8-046", as: "cost", suspended: false },
          ],
          hand: [{ card: "BT8-054", as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("cost").isSuspended);
    expect(s.state.memory).toBe(2);
  });

  it("gives its host +1000 DP for each other suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-057", as: "host", under: ["BT8-054"], suspended: true },
          { card: "BT8-046", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT8-046", suspended: true }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });
});
