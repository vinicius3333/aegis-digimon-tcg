import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-076.js";

describe("BT10-076 Troopmon", () => {
  it("trashes one of its digivolution cards to gain memory when the opponent plays a card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-076", as: "troopmon", under: [{ card: "BT10-071", as: "cost" }] }] },
        1: { hand: [{ card: "BT1-010", as: "played" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });

  it("gains owner memory when its inherited source is trashed on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-081", as: "host", under: [{ card: "BT10-076", as: "source" }] }] },
    }, { autoOrderTriggers: true });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("source").instanceId],
      1,
    );
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(-1);
  });

  it("ignores your plays and reacts to an opposing Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-076", as: "troopmon", under: [{ card: "BT10-071", as: "cost" }] },
            { card: "BT1-010", as: "yourPlayedDigimon" },
          ],
        },
        1: { battleArea: [{ card: "BT1-085", as: "opposingTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("yourPlayedDigimon").permanentId,
    });
    expect(s.perm("troopmon").stack.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);

    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("opposingTamer").permanentId,
    });
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
  });
});
