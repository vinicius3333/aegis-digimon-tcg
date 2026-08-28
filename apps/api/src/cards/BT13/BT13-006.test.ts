import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-006.js";

function deleteKapurimonHost(s: ReturnType<typeof setupEngine>) {
  return s.engine.applyIntent(1, {
    type: "attack" as const,
    attackerPermanentId: s.perm("attacker").permanentId,
    target: { kind: "permanent" as const, permanentId: s.perm("host").permanentId },
  });
}

describe("BT13-006 Kapurimon", () => {
  it("trashes 1 hand card to delete an opposing level 3 when its evolved stack is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-079", as: "host", dp: 1000, suspended: true, under: ["BT13-006"] }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "attacker", dp: 12000 },
            { card: "BT1-010", as: "level3Target" },
            { card: "BT1-016", as: "level4NonTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(deleteKapurimonHost(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("level4NonTarget").permanentId,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(false);
  });

  it("may decline without trashing a hand card or deleting the level 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-079", as: "host", dp: 1000, suspended: true, under: ["BT13-006"] }],
          hand: [{ card: "BT1-001", as: "kept" }],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "attacker", dp: 12000 },
            { card: "BT1-010", as: "level3Target" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(deleteKapurimonHost(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kept").instanceId);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("level3Target").permanentId),
    ).toBe(true);
  });

  it("may trash the hand cost even when there is no opposing level 3 (Q2258)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-079", as: "host", dp: 1000, suspended: true, under: ["BT13-006"] }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "attacker", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(deleteKapurimonHost(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
