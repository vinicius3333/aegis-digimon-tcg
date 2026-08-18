import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

type EngineInternals = {
  primitives: {
    deletePermanent(ids: string[], cause: "byEffect" | "byBattle"): Promise<unknown>;
    returnToHand(instanceIds: string[]): Promise<unknown>;
  };
};

function internals(s: ReturnType<typeof setupEngine>): EngineInternals {
  return s.engine as unknown as EngineInternals;
}

// A3 for P-072 (MetalGreymon: Alterous Mode) — [When Digivolving] effect:
//   "If you have a Tamer in play, delete 1 of your opponent's Digimon with 5000 DP or less."
//
// FAILS-WHEN-REVERTED: without the P-072 module the opponent's Digimon is NOT deleted
//   after digivolving, even when a Tamer is in play and the target is ≤5000 DP.

const P_072 = "P-072";
const BASE_RED_LV4 = "AD1-001"; // Greymon, Red Lv4 — valid base for P-072 (Red Lv4, cost 3)
const TAMER = "BT1-089"; // Mimi Tachikawa — just any Tamer
const OPP_DIGIMON_LE5000 = "AD1-001"; // Greymon, DP 5000

describe("P-072 MetalGreymon: Alterous Mode — [When Digivolving] delete ≤5000 DP", () => {
  it("digivolves from a MetalGreymon-named Digimon for cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "metalgreymon" }],
        hand: [{ card: P_072, as: "p072" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("p072").instanceId,
        permanentId: s.perm("metalgreymon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metalgreymon").topCard?.cardId === P_072);

    expect(s.state.memory).toBe(10);
  });

  it("deletes an opponent Digimon with ≤5000 DP when a Tamer is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BASE_RED_LV4, as: "basePerm", dp: 5000 },
            { card: TAMER, as: "tamerPerm", dp: 0 },
          ],
          hand: [{ card: P_072, as: "p072" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON_LE5000, as: "oppPerm", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const basePerm = s.perm("basePerm");
    const oppPerm = s.perm("oppPerm");

    // Enough memory to digivolve (Red Lv4 EvoCost = 3).
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("p072").instanceId,
        permanentId: basePerm.permanentId,
      }),
    ).toEqual({ ok: true });

    // After settling, the opponent's Digimon should have been deleted.
    await settle(() => !p1.battleArea.some((p) => p.permanentId === oppPerm.permanentId), 400);

    // Fails-when-reverted: without P-072's WhenDigivolving, the opponent Digimon stays.
    expect(p1.battleArea.some((p) => p.permanentId === oppPerm.permanentId)).toBe(false);
  });

  it("does NOT delete when no Tamer is in play", async () => {
    const s = setupEngine(
      {
        // No Tamer in player 0's battle area.
        0: {
          battleArea: [{ card: BASE_RED_LV4, as: "basePerm", dp: 5000 }],
          hand: [{ card: P_072, as: "p072" }],
        },
        // Opponent has a ≤5000 DP Digimon.
        1: { battleArea: [{ card: OPP_DIGIMON_LE5000, as: "oppPerm", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const p1 = s.state.players[1]!;
    const basePerm = s.perm("basePerm");
    const oppPerm = s.perm("oppPerm");

    s.state.memory = 3;

    s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: s.inst("p072").instanceId,
      permanentId: basePerm.permanentId,
    });

    await settle(
      () => p0.battleArea.find((p) => p.permanentId === basePerm.permanentId)?.topCard?.cardId === P_072,
      200,
    );

    // Without a Tamer, the WhenDigivolving canActivate fails — opponent Digimon stays.
    expect(p1.battleArea.some((p) => p.permanentId === oppPerm.permanentId)).toBe(true);
  });

  it("prevents effect deletion by trashing exactly 2 same-level digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-025",
              as: "host",
              under: [
                { card: "BT1-009", as: "level-3-a" },
                { card: "BT1-010", as: "level-3-b" },
                { card: P_072, as: "inherited" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const hostId = s.perm("host").permanentId;
    const paidIds = [s.inst("level-3-a").instanceId, s.inst("level-3-b").instanceId];
    await s.ready();

    await internals(s).primitives.deletePermanent([hostId], "byEffect");
    await settle();

    const surviving = s.state.players[0]!.battleArea.find((p) => p.permanentId === hostId);
    expect(surviving).toBeDefined();
    expect(surviving!.stack.map((card) => card.instanceId)).not.toEqual(
      expect.arrayContaining(paidIds),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining(paidIds),
    );
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("also prevents an effect return to hand and leaves the top card in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-025",
              as: "host",
              under: ["BT1-009", "BT1-010", P_072],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const host = s.perm("host");
    const hostId = host.permanentId;
    const topId = host.topCard!.instanceId;
    await s.ready();

    await internals(s).primitives.returnToHand([topId]);
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === topId)).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("does not prevent leaving when its digivolution cards have different levels", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-025",
              as: "host",
              under: ["BT1-009", "AD1-001", P_072],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();

    await internals(s).primitives.deletePermanent([hostId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
  });

  it("does not prevent effect deletion when the current name has neither Greymon nor Omnimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-044", as: "host", under: ["BT1-009", "BT1-010", P_072] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();

    await internals(s).primitives.deletePermanent([hostId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
  });

  it("does not prevent a battle deletion even with a valid same-level pair", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-025", as: "host", under: ["BT1-009", "BT1-010", P_072] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();

    await internals(s).primitives.deletePermanent([hostId], "byBattle");
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(4);
  });

  it("may decline the inherited prevention and pay no separate cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-025", as: "host", under: ["BT1-009", "BT1-010", P_072] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const hostId = s.perm("host").permanentId;
    await s.ready();

    await internals(s).primitives.deletePermanent([hostId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === hostId)).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(4);
  });
});
