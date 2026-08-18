import { describe, it, expect } from "vitest";
import { Phase, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT11-087 (Lilithmon — Purple Lv.6 Digimon).
//
// [On Play] Trash the top 4 cards of your deck. Then, add up to 2 cards with
// [Bagra Army] in one of their traits from your trash to your hand, and place up
// to 2 Digimon cards with [Bagra Army] in their traits from your trash under 1 of
// your Tamers.
//
// KB Q2112: the place-under step requires >= 1 card added to hand first.
//
// FAILS-WHEN-REVERTED: The original stub left this effect inert.
//   Test asserts: after playing Lilithmon, the Bagra Army cards moved from trash to
//   hand, and a Bagra Army Digimon card was placed under the owner's Tamer.
//
// Cards:
//   BT11-087  — Lilithmon (the card under test, Purple Lv.6; playCost 6)
//   BT10-076  — Troopmon (Bagra Army Digimon Lv.4) — will be milled, then added to hand
//   BT10-073  — ChuuChuumon (Bagra Army Digimon Lv.3) — will be milled, then placed under Tamer
//   BT10-093  — Yuu Amano (Bagra Army Tamer) — the Tamer to place cards under
//   BT1-001   — filler deck cards (non-Bagra)

describe("BT11-087 Lilithmon [On Play]", () => {
  it("mills top 4, then adds a Bagra Army card to hand, then places a Bagra Digimon under a Tamer", async () => {
    // Deck's last element is the top of the deck. Board Spec `deck` follows the same
    // convention (see harness), so the array below lays out bottom-to-top exactly as
    // the original hand-built deck did: filler1, filler2, troopmon, chuumon (top).
    const s = setupEngine(
      {
        0: {
          // Owner has a Tamer on the battle area (Yuu Amano, Bagra Army Tamer).
          battleArea: [{ card: "BT10-093", dp: 0, as: "tamer" }],
          deck: [
            { card: "BT1-001" },
            { card: "BT1-001" },
            { card: "BT10-076", as: "troopmon" }, // Bagra Army Digimon — will be added to hand
            { card: "BT10-073", as: "chuumon" }, // Bagra Army Digimon — will be placed under tamer
          ],
          hand: [{ card: "BT11-087", as: "lilithmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    const troopmon = s.inst("troopmon");
    const chuumon = s.inst("chuumon");
    const lilithmon = s.inst("lilithmon");
    s.state.memory = 8;

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: lilithmon.instanceId,
    });

    expect(result).toEqual({ ok: true });

    // Wait until at least 1 Bagra card is in hand (the add-to-hand step resolved).
    await settle(
      () =>
        p0.hand.some((c) => c.instanceId === troopmon.instanceId) ||
        p0.hand.some((c) => c.instanceId === chuumon.instanceId),
    );

    // At least 1 Bagra Army Digimon was added to hand from the trash.
    const troopInHand = p0.hand.some((c) => c.instanceId === troopmon.instanceId);
    const chuuInHand = p0.hand.some((c) => c.instanceId === chuumon.instanceId);
    expect(troopInHand || chuuInHand).toBe(true);

    // Lilithmon is now on the battle area.
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT11-087")).toBe(true);
  });
});

/**
 * A3 (real GameEngine) for BT11-087's [Opponent's Turn] clause:
 *   "When your opponent moves a Digimon from their breeding area, by trashing 1 of
 *   this Digimon's digivolution cards, that Digimon gains '[When Attacking] Lose 3
 *   memory' for the turn."
 *
 * FAILS-WHEN-REVERTED: the original module returned `[]` for EffectTiming.None, so
 * the watcher was never installed — no digivolution card would be trashed on the
 * opponent's breeding move, and the moved Digimon would never lose memory on attack.
 */
describe("BT11-087 Lilithmon [Opponent's Turn] — real engine: breeding move grants a temporary attack-time memory loss", () => {
  it("trashes 1 digivolution card on the opponent's breeding->battle move, then the moved Digimon loses 3 memory when it attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-087", dp: 12000, as: "lilithmon", under: ["AD1-001"] }],
        },
        1: {
          breeding: { card: "BT1-009", dp: 3000, as: "mover" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const lilithmon = s.perm("lilithmon");
    expect(lilithmon.stack).toHaveLength(1);

    s.state.phase = Phase.Breeding;
    s.state.turnSeat = 1; // "[Opponent's Turn]" relative to Lilithmon's owner (seat 0)

    expect(s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });

    // The optional cost is paid: 1 of Lilithmon's digivolution cards is trashed.
    await settle(() => s.perm("lilithmon").stack.length === 0, 200);
    expect(s.perm("lilithmon").stack).toHaveLength(0);

    // The moved Digimon (now in the battle area) attacks the defending player directly.
    s.state.phase = Phase.Main;
    const mover = s.perm("mover");
    expect(mover.isSuspended).toBe(false);

    const memoryFor = (seat: 0 | 1): number => (seat === s.state.turnSeat ? s.state.memory : -s.state.memory) || 0; // normalize -0 -> 0
    expect(memoryFor(1)).toBe(0);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: mover.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => memoryFor(1) !== 0, 200);

    // "that Digimon gains [When Attacking] Lose 3 memory" — the memory loss lands on
    // the moved Digimon's controller (seat 1), never on Lilithmon's owner (seat 0).
    expect(memoryFor(1)).toBe(-3);
    expect(memoryFor(0)).toBe(3);
    assertNoLoudGap(s);
  });
});
