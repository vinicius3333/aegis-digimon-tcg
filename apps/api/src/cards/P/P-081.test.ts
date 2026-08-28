import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-081.js";

describe("P-081 Falcomon", () => {
  it("gives one opponent Digimon -2000 DP with a yellow Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-081", as: "source" }],
          battleArea: [{ card: "BT1-087", as: "tamer" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(3000);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("does not reduce DP without a yellow Tamer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-081", as: "source" }], battleArea: [{ card: "BT1-086", as: "blue-tamer" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("target").currentDP).toBe(5000);
  });
});
