import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT11-050.js";

describe("BT11-050 Ninjamon", () => {
  it("inherited effect suspends an opponent's Digimon when its controller plays a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-018", under: ["BT11-050"] }],
          hand: [{ card: "BT1-085", as: "tamer" }],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not react to the opponent playing a Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-018", under: ["BT11-050"] }] },
        1: {
          battleArea: [{ card: "BT1-028", as: "target" }],
          hand: [{ card: "BT1-085", as: "opponentTamer" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("opponentTamer").instanceId),
    );

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("activates only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-018", under: ["BT11-050"] }],
          hand: [
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-086", as: "secondTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("secondTamer").instanceId),
    );

    expect(s.perm("target").isSuspended).toBe(false);
  });
});
