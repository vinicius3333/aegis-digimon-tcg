import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-057.js";

describe("BT11-057 Titamon", () => {
  it("trashes up to 3, suspends that many opposing Digimon, then gains memory for all suspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-075", as: "base" }],
          hand: [
            { card: "BT11-057", as: "titamon" },
            { card: "BT1-009", as: "discard-a" },
            { card: "BT1-010", as: "discard-b" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target-a" },
            { card: "BT1-015", as: "target-b" },
            { card: "BT1-020", as: "already-suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.length === 2 &&
        s.state.players[1]!.battleArea.every(({ isSuspended }) => isSuspended),
    );
    expect(s.state.players[1]!.battleArea.every(({ isSuspended }) => isSuspended)).toBe(true);
    expect(s.state.memory).toBe(6); // printed evolution cost is 7: 10 - 7 + 3 suspended
    expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(true);
  });
});
