import { describe, it, expect } from "vitest";
import { getCardDefinition, Phase, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./BT11-087.js";
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
//   BT12-094  — Yuu Amano (Bagra Army Tamer) — the Tamer to place cards under
//   BT1-001   — filler deck cards (non-Bagra)

describe("BT11-087 Lilithmon [On Play]", () => {
  it("maps catalog facts and both printed effects to IR", () => {
    expect(getCardDefinition("BT11-087")).toMatchObject({ cardId: "BT11-087", colors: ["Purple"], level: 6, playCost: 11, dp: 12000, types: ["Demon Lord", "Bagra Army"] });
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", actions: [{ kind: "TrashTopDeck", amount: 4 }, { kind: "Return", to: "hand" }, { kind: "PlaceUnder" }] },
      { trigger: "OpponentsTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentMovedFromBreeding" }] },
    ]);
  });

  it("has complete registered IR coverage", () => {
    const compiled = runtimeCompiledCard("BT11-087")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toHaveLength(0);
  });

  it("mills top 4, then adds a Bagra Army card to hand, then places a Bagra Digimon under a Tamer", async () => {
    // Deck's last element is the top of the deck. Board Spec `deck` follows the same
    // convention (see harness), so the array below lays out bottom-to-top exactly as
    // the original hand-built deck did: filler1, filler2, troopmon, chuumon (top).
    const s = setupEngine(
      {
        0: {
          // Owner has a Tamer on the battle area (Yuu Amano, Bagra Army Tamer).
          battleArea: [{ card: "BT12-094", dp: 0, as: "tamer" }],
          deck: [
            { card: "BT10-076" }, // Bagra Army Digimon — one copy added to hand
            { card: "BT10-073" }, // Bagra Army Digimon — one copy placed under tamer
            { card: "BT10-076", as: "troopmon" }, // Bagra Army Digimon — one copy added to hand
            { card: "BT10-073", as: "chuumon" }, // Bagra Army Digimon — one copy placed under tamer
          ],
          hand: [{ card: "BT11-087", as: "lilithmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;

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
        p0.hand.filter((c) => c.cardId === "BT10-076" || c.cardId === "BT10-073").length === 2 &&
        s.perm("tamer").stack.length === 2,
    );

    // At least 1 Bagra Army Digimon was added to hand from the trash.
    expect(p0.hand.filter((c) => c.cardId === "BT10-076" || c.cardId === "BT10-073")).toHaveLength(2);
    expect(s.perm("tamer").stack).toHaveLength(2);

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

  it("does not react when Lilithmon's controller moves their own Digimon from breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-087", dp: 12000, as: "lilithmon", under: ["AD1-001"] }],
          breeding: { card: "BT1-009", dp: 3000, as: "mover" },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.phase = Phase.Breeding;
    s.state.turnSeat = 0;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });

    await settle(() => s.perm("lilithmon").stack.length === 1, 200);
    expect(s.perm("lilithmon").stack).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
