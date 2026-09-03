import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT22-005.js";

describe("BT22-005 Tsumemon", () => {
  it("draws once for either a CS or Unidentified Digimon played on its controller's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-053", under: ["BT22-005"], as: "host" }],
          hand: [
            { card: "BT22-043", as: "cs" },
            { card: "BT17-053", as: "unidentified" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cs").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("cs") !== undefined && s.state.players[0]!.deck.length === 1);
    expect(s.state.players[0]!.deck).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unidentified").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("unidentified") !== undefined);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw for a near-matching card, an opponent's card, or on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-053", under: ["BT22-005"], as: "host" }],
          hand: [{ card: "BT1-009", as: "nonmatch" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { hand: [{ card: "BT22-043", as: "opponentCs" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonmatch").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("nonmatch") !== undefined);
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentCs").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponentCs") !== undefined);

    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
