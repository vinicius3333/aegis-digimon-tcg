import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-011.js";

describe("P-011 Veedramon Zero", () => {
  it("may trash exactly the top 3 cards with a blue Tamer to gain +2000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-011", as: "attacker" },
            { card: "BT1-086", as: "tamer" },
          ],
          deck: [
            { card: "BT1-001", as: "first" },
            { card: "BT1-002", as: "second" },
            { card: "BT1-003", as: "third" },
            { card: "BT1-004", as: "remaining" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("attacker").baseDP;
    const trashed = [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3 && s.perm("attacker").currentDP === baseDP + 2000);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining(trashed));
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("remaining").instanceId);
  });

  it("cannot pay the mill cost with fewer than 3 cards in deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-011", as: "attacker" }, { card: "BT1-086" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const baseDP = s.perm("attacker").baseDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("attacker").currentDP).toBe(baseDP);
  });

  it("returns 3 non-Digi-Egg cards from trash to deck bottom, then draws", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-043", as: "attacker", under: ["P-011"] }],
          deck: [{ card: "BT1-001", as: "drawn" }],
          trash: [
            { card: "BT1-009", as: "digimon" },
            { card: "BT1-086", as: "tamer" },
            { card: "BT1-094", as: "option" },
            { card: "BT1-001", as: "egg" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    const drawnId = s.inst("drawn").instanceId;
    const eggId = s.inst("egg").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });
});
