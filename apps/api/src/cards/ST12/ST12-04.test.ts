import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST12-04 Huckmon", () => {
  it("gains 1 memory when a Sistermon is played and grants its Huckmon host +1000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST12-04", as: "huckmon" },
            { card: "ST12-06", as: "host", under: ["ST12-04"] },
          ],
          hand: [{ card: "ST12-12", as: "sister" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sister").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
  });

  it("gains memory only once per turn across multiple Sistermon plays", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST12-04", as: "huckmon" }],
          hand: [
            { card: "ST12-13", as: "first" },
            { card: "ST12-13", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.memory === 7);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(3);
  });

  it("does not gain memory when a non-Sistermon Digimon is played", async () => {
    const s = setupEngine({ 0: { battleArea: ["ST12-04"], hand: [{ card: "ST12-02", as: "other" }] } });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("other").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(0);
  });

  it("does not gain memory when the opponent plays a Sistermon", async () => {
    const s = setupEngine({
      0: { battleArea: ["ST12-04"] },
      1: { hand: [{ card: "ST12-12", as: "opponentSister" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentSister").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
  });

  it("gains only 1 memory when two Sistermon are played in one effect window (Q756)", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["ST12-04"],
        hand: [
          { card: "BT10-085", as: "first" },
          { card: "BT10-085", as: "second" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.playInstances(
      [s.inst("first").instanceId, s.inst("second").instanceId],
      "test-effect-play",
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT10-085")).toHaveLength(2);
  });
});
