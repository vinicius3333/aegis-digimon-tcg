import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-047.js";

describe("BT8-047 Pulsemon", () => {
  it("gives its host +1000 DP for each other suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-042", as: "host", under: ["BT8-047"], suspended: true },
          { card: "BT8-034", suspended: true },
          { card: "BT8-035", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT8-034", suspended: true }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("digivolves from a green level-2 Digimon and exposes the inherited scaling", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-007", as: "base" },
          { card: "BT8-034", suspended: true },
          { card: "BT8-035", suspended: true },
        ],
        hand: [{ card: "BT8-047", as: "evolving" }],
      },
    });
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-047");

    expect(s.perm("base").topCard.cardId).toBe("BT8-047");
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP + 2000);
    expect(s.state.memory).toBe(1);
  });
});
