import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("RB1-010 Siriusmon", () => {
  it("places a Gammamon-text card as cost before deleting a qualifying opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-009", as: "base" }], hand: [{ card: "RB1-010", as: "sirius" }, "RB1-005"] },
        1: { battleArea: [{ card: "EX2-045", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const oldTopId = s.inst("base").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sirius").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(oldTopId);
    expect(s.perm("base").stack.some((card) => card.cardId === "RB1-005")).toBe(true);
  });

  it("does not pay the placement cost or delete when the player declines", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-009", as: "base" }], hand: [{ card: "RB1-010", as: "sirius" }, "RB1-005"] },
        1: { battleArea: [{ card: "EX2-045", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sirius").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "RB1-005")).toBe(true);
  });

  it("unsuspends once when an opponent Digimon is deleted during your turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-010", as: "sirius", suspended: true }] },
        1: {
          battleArea: [
            { card: "EX2-045", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    await settle(() => !s.perm("sirius").isSuspended);
    expect(s.perm("sirius").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("sirius").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");
    expect(s.perm("sirius").isSuspended).toBe(true);
  });

  it("does not consume the once-per-turn watcher when its optional unsuspend is declined", async () => {
    const options = { autoDeclineOptional: true, autoAcceptOptional: false, autoSelectCards: true };
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-010", as: "sirius", suspended: true }] },
        1: {
          battleArea: [
            { card: "EX2-045", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
        },
      },
      options,
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    expect(s.perm("sirius").isSuspended).toBe(true);
    options.autoDeclineOptional = false;
    options.autoAcceptOptional = true;
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");
    await settle(() => !s.perm("sirius").isSuspended);
    expect(s.perm("sirius").isSuspended).toBe(false);
  });

  it("resets the once-per-turn unsuspend after a real opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-010", as: "sirius", suspended: true }],
          deck: Array.from({ length: 8 }, () => "BT1-010"),
        },
        1: {
          battleArea: [
            { card: "EX2-045", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
          deck: Array.from({ length: 8 }, () => "BT1-010"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    await advance(s.engine).verb.deletePermanent([firstId], "byEffect");
    await settle(() => !s.perm("sirius").isSuspended);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("sirius").permanentId]);
    await advance(s.engine).verb.deletePermanent([secondId], "byEffect");
    await settle(() => !s.perm("sirius").isSuspended);
    expect(s.perm("sirius").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });
});
