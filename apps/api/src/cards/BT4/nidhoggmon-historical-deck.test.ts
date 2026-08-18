import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-052.js";
import "./BT4-059.js";
import "./BT4-062.js";
import "./BT4-095.js";

describe("BT4 Nidhoggmon historical deck gauntlet", () => {
  it("combines Yoshino, Digi-Burst recovery, mass suspension, and bottom-deck removal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-095", as: "yoshino" },
            {
              card: "BT4-059",
              as: "lilamon",
              under: [
                "BT4-004",
                { card: "BT4-052", as: "lalamon" },
                "BT4-054",
                "BT4-055",
              ],
            },
          ],
          hand: [{ card: "BT4-062", as: "nidhoggmon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lowUnsuspended" },
            {
              card: "BT1-084",
              as: "highSuspended",
              suspended: true,
              under: [
                { card: "BT1-009", as: "highSourceOne" },
                { card: "BT1-011", as: "highSourceTwo" },
              ],
            },
            { card: "BT1-084", as: "highUnsuspended" },
          ],
          deck: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lilamon").permanentId,
        instanceId: s.inst("nidhoggmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.perm("yoshino").isSuspended &&
      s.perm("lilamon").topCard.instanceId === s.inst("nidhoggmon").instanceId &&
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("lalamon").instanceId) &&
      s.state.players[1]!.battleArea.length === 1 &&
      s.state.pendingDecision === undefined
    );

    expect(s.state.memory).toBe(0);
    // Evolving adds Lilamon as a fifth source; Digi-Burst must consume exactly four.
    expect(s.perm("lilamon").stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("highUnsuspended").permanentId);
    // Q1219: an already-suspended Digimon is returned even when its DP is above 5000.
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-012", "BT1-010", "BT1-084"]),
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("highSourceOne").instanceId,
        s.inst("highSourceTwo").instanceId,
      ]),
    );
    assertNoLoudGap(s);
  });
});
