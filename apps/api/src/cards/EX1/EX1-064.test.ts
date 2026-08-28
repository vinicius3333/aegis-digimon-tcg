import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-064.js";

describe("EX1-064 Piedmon", () => {
  it("deletes up to 4 unsuspended level-4-or-lower Digimon and draws only once for the simultaneous deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX1-064", as: "piedmon" }],
          battleArea: [{ card: "EX1-056", as: "purpleSource" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "one" },
            { card: "BT1-010", as: "two" },
            { card: "BT1-011", as: "three" },
            { card: "BT1-012", as: "four" },
            { card: "EX1-061", as: "level5" },
            { card: "BT1-013", as: "suspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piedmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([
      s.perm("level5").permanentId,
      s.perm("suspended").permanentId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
