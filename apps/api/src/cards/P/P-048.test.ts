import { describe, it, expect } from "vitest";
import { Zone } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for P-048 (UlforceVeedramon Zero) — [When Digivolving] effect:
//   "You may place 3 non-Digi-Egg cards from your trash at the bottom of your deck to
//    unsuspend this Digimon and 1 of your Tamers."
//
// FAILS-WHEN-REVERTED: without the P-048 module the effect does nothing —
//   after digivolving + paying trash cost, P-048 remains suspended.

const P_048 = "P-048";
const BASE_BLUE_LV5 = "BT1-038"; // Monzaemon, Blue Lv5 — a valid base for P-048 (Blue Lv5+)
const FILLER_1 = "AD1-001"; // non-DigiEgg filler for trash
const FILLER_2 = "AD1-002";
const FILLER_3 = "AD1-003";

describe("P-048 UlforceVeedramon Zero — [When Digivolving] unsuspend", () => {
  it("unsuspends the Digimon after paying 3 non-DigiEgg from trash cost", async () => {
    const s = setupEngine(
      {
        0: {
          // Base permanent (Blue Lv5 Digimon, suspended — digivolving suspends the base).
          battleArea: [
            { card: BASE_BLUE_LV5, as: "basePerm", dp: 4000, suspended: true },
            { card: "BT1-086", as: "tamer", suspended: true },
          ],
          hand: [{ card: P_048, as: "p048" }],
          // 3 non-DigiEgg cards in trash (the cost).
          trash: [FILLER_1, FILLER_2, FILLER_3],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const basePerm = s.perm("basePerm");

    // Enough memory to digivolve (cost 4 from Blue Lv5).
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("p048").instanceId,
        permanentId: basePerm.permanentId,
      }),
    ).toEqual({ ok: true });

    // After settling, the permanent should be unsuspended (P-048 WhenDigivolving effect).
    await settle(
      () => {
        const perm = p0.battleArea.find((p) => p.permanentId === basePerm.permanentId);
        return perm !== undefined && !perm.isSuspended && !s.perm("tamer").isSuspended && s.state.memory === 1;
      },
      400,
    );

    const perm = p0.battleArea.find((p) => p.permanentId === basePerm.permanentId);
    expect(perm).toBeDefined();
    // Fails-when-reverted: without P-048's WhenDigivolving, the permanent stays suspended.
    expect(perm?.isSuspended).toBe(false);
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1); // Paid 4, then the once-per-turn return trigger gained 1.

    const another = s.give(0, Zone.Trash, "BT1-009");
    await (s.engine as unknown as {
      primitives: { returnToDeck(ids: string[]): Promise<unknown> };
    }).primitives.returnToDeck([another.instanceId]);
    await settle();
    expect(s.state.memory).toBe(1); // The second return in the same turn doesn't gain memory.
  });

  it("does not unsuspend when trash has fewer than 3 non-DigiEgg cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BASE_BLUE_LV5, as: "basePerm", dp: 4000, suspended: true }],
          hand: [{ card: P_048, as: "p048" }],
          // Only 2 non-DigiEgg cards in trash — canActivate fails.
          trash: [FILLER_1, FILLER_2],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const basePerm = s.perm("basePerm");

    s.state.memory = 4;

    s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: s.inst("p048").instanceId,
      permanentId: basePerm.permanentId,
    });

    await settle(
      () => p0.battleArea.find((p) => p.permanentId === basePerm.permanentId)?.topCard?.cardId === P_048,
      200,
    );

    // With < 3 non-DigiEgg, the effect cannot activate.
    // The permanent may or may not be suspended (depends on engine digivolve base logic),
    // but the unsuspend via the effect definitely did NOT run (no 3-trash cost paid).
    // We assert the trash is unchanged (no cards moved to deck).
    expect(p0.deck.length).toBe(0);
    expect(s.perm("basePerm").isSuspended).toBe(true);
    expect(p0.trash).toHaveLength(2);
  });

  it("may decline to return the 3 cards and leaves both permanents suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: BASE_BLUE_LV5, as: "basePerm", suspended: true },
            { card: "BT1-086", as: "tamer", suspended: true },
          ],
          hand: [{ card: P_048, as: "p048" }],
          trash: [FILLER_1, FILLER_2, FILLER_3],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("p048").instanceId,
        permanentId: s.perm("basePerm").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("basePerm").isSuspended).toBe(true);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.memory).toBe(0);
  });

  it("gains memory once when an AeroVeedramon Zero stack returns 3 cards while attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: P_048, as: "ulforce" },
            { card: "BT1-009", as: "attacker", dp: 12000, under: ["P-047"] },
          ],
          trash: [
            { card: "BT1-009", as: "trash-a" },
            { card: "BT1-010", as: "trash-b" },
            { card: "BT1-011", as: "trash-c" },
          ],
        },
        1: { security: ["BT1-028"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const baseDp = s.perm("attacker").baseDP;
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.memory === 1 &&
      s.perm("attacker").currentDP === baseDp + 2000
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.perm("attacker").currentDP).toBe(baseDp + 2000);
    assertNoLoudGap(s);
  });
});
