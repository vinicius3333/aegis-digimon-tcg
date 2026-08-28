import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-060.js";

describe("BT12-060 ChuuChuumon", () => {
  it("digivolves for 0 from a level 2 with Save text and rejects a plain level 2", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT12-005", as: "saveBase" }],
        hand: [{ card: "BT12-060", as: "chu" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("saveBase").permanentId,
        instanceId: valid.inst("chu").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("saveBase").topCard.cardId === "BT12-060");
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("saveBase").stack.map(({ cardId }) => cardId)).toEqual(["BT12-005"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT12-001", as: "plainBase" }], hand: [{ card: "BT12-060", as: "chu" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBase").permanentId,
        instanceId: invalid.inst("chu").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gives Blocker to a Save-text host on its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-063", as: "host", under: ["BT12-060"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("does not give Blocker to a host without Save in its text", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-060"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);

    const offTurn = setupEngine({ 0: { battleArea: [{ card: "BT12-063", as: "host", under: ["BT12-060"] }] } });
    offTurn.state.turnSeat = 1;
    await offTurn.ready();
    expect(observe(offTurn.engine).hasKeyword(offTurn.perm("host"), "Blocker")).toBe(false);
  });

  it("Saves itself under a Tamer on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-060", as: "source" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const cardInstanceId = s.perm("source").topCard.instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.perm("tamer").stack.some(({ instanceId }) => instanceId === cardInstanceId));
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([cardInstanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([]);
  });

  it("may decline Save and leaves the deleted card in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-060", as: "source" },
            { card: "BT12-094", as: "tamer" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const cardInstanceId = s.inst("source").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([cardInstanceId]);
  });
});
