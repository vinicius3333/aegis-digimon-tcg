import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT22-005.js";

describe("BT22-005 Tsumemon", () => {
  it("hatches publicly and legally evolves Tsumemon into Keramon, while rejecting an invalid Agumon route", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT22-005", as: "egg" }],
        hand: [
          { card: "BT22-053", as: "keramon" },
          { card: "BT22-008", as: "invalid" },
        ],
      },
    });
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-005");
    s.state.phase = Phase.Main;
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("keramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT22-053");

    expect(s.state.players[0]!.breeding?.stack.map((card) => card.cardId)).toEqual(["BT22-005"]);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.state.players[0]!.breeding!.permanentId,
        instanceId: s.inst("invalid").instanceId,
      }).ok,
    ).toBe(false);
  });

  it("draws for an Unidentified Digimon independently of the CS path", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-053", under: ["BT22-005"], as: "host" }],
          hand: [{ card: "BT17-053", as: "unidentified" }],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unidentified").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("unidentified") !== undefined);

    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

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

  it("resets the once-per-turn draw after a complete round of public turns", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-053", under: ["BT22-005"], as: "host" }],
          hand: [
            { card: "BT22-043", as: "firstCs" },
            { card: "BT22-043", as: "secondCs" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: { deck: ["BT1-005", "BT1-006"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstCs").instanceId }).ok).toBe(true);
    await settle(() => s.state.players[0]!.deck.length === 3);
    const firstTurnCount = s.state.turnCount;

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    expect(s.state.turnCount).toBeGreaterThan(firstTurnCount);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondCs").instanceId }).ok).toBe(true);
    await settle(() => s.state.players[0]!.deck.length === 2);
    expect(s.state.players[0]!.deck).toHaveLength(2);
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

  it("does not draw for an opponent-controlled qualifying subject while this watcher is live", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT22-053", under: ["BT22-005"], as: "host" }],
        deck: ["BT1-001", "BT1-002"],
      },
      1: { battleArea: [{ card: "BT22-043", as: "opponentSubject" }] },
    });
    await s.ready();

    // No suitable public effect-driven opponent play exists in this fixture set;
    // this is the production-provenance sub-trigger seam with an opponent subject.
    await advance(s.engine).fireSubTrigger("whenPlayed", {
      subjectPermanentId: s.perm("opponentSubject").permanentId,
    });

    expect(s.state.players[0]!.deck).toHaveLength(2);
  });
});
