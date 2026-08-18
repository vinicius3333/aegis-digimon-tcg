import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-103.js";

describe("BT11-103 Poison Powder", () => {
  it("makes every current opposing Digimon lose 1 memory when each becomes suspended", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT1-088"], hand: [{ card: "BT11-103", as: "option" }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "a" },
          { card: "BT1-015", as: "b" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    s.state.memory = 0;
    await advance(s.engine).verb.suspend([s.perm("a").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("b").permanentId]);
    expect(s.state.memory).toBe(2); // opponent lost 2 total, represented from turn seat 0
  });
});
