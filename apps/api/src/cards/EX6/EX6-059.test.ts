import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX6-059.js";

describe("EX6-059 Barbamon", () => {
  it("contains hand-trash revival, Scapegoat, and scaled play-cost IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("whenHandTrashed");
    expect(text).toContain("Scapegoat");
    expect(text).toContain("playCostLteScaling");
  });

  it("plays a purple card exactly at the scaled cost-9 ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-059", as: "barbamon" }], trash: ["BT10-012"] },
        1: { hand: [{ card: "BT1-010", as: "discard" }, "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-012"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-012")).toBe(true);
  });

  it("rejects an isolated purple card above the scaled cost-9 ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-059", as: "barbamon" }], trash: ["BT11-071"] },
        1: { hand: [{ card: "BT1-010", as: "discard" }, "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 0);
    await settle(() => s.state.players[1]!.hand.length === 1);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT11-071"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX6-059"]);
  });

  it("limits the discard watcher to once per opponent turn and rearms on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-059", as: "barbamon" }],
          trash: [
            { card: "EX6-047", as: "revivedA" },
            { card: "EX6-047", as: "revivedB" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: {
          hand: [
            { card: "BT1-010", as: "discardA" },
            { card: "BT1-010", as: "discardB" },
            { card: "BT1-010", as: "discardC" },
          ],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.trash([s.inst("discardA").instanceId], 0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revivedA").instanceId),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    await advance(s.engine).verb.trash([s.inst("discardB").instanceId], 0);
    await Promise.resolve();
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revivedB").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.trash([s.inst("discardC").instanceId], 0);
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("revivedB").instanceId),
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });

  it("allows refusing the optional purple play after an opponent hand discard", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-059", as: "barbamon" }], trash: [{ card: "EX6-047", as: "revived" }] },
        1: { hand: [{ card: "BT1-010", as: "discard" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 0);
    await settle(() => s.state.players[1]!.hand.length === 0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("revived").instanceId)).toBe(true);
  });
});
