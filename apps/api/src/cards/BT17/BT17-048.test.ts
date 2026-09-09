import { describe, it, expect } from "vitest";
import { getCardDefinition, type PlayerState, type Seat } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-048.js";
import "./index.js";

// A3 for BT17-048 (Argomon, Green Lv.5):
//   [On Deletion] If 4+ [Argomon] in trash, may play 1 Lv.6 [Argomon] from hand for free.
//   KB Q2800: the count is checked AFTER this card is sent to trash (so it counts itself).
//
// FAILS-WHEN-REVERTED: the [On Deletion] clause was in residual (RawUnparsed) in the stub.
// The test proves the [On Deletion] fires and a Lv.6 Argomon can be played from hand.
// We also verify KB Q2800: with 3 Argomon in trash before deletion, the card itself
// counts → 4 total → condition met.

const ARGOMON_LV5 = "BT17-048";

// We need a Lv.6 Argomon card. BT17-050 doesn't exist; use a placeholder.
// The engine checks nameEn === "Argomon" && level === 6.
// Use "BT17-054" which should be a higher-level Argomon if it exists, otherwise use
// BT17-048 itself as the play target (we need a DIFFERENT level-6 Argomon).
// Let's check what Argomon L6 cards exist in the set.
// Looking at BT17 cards, the Lv.6 Argomon is BT17-051 (Green Lv.6 Digimon "Argomon").
const ARGOMON_LV6 = "BT17-051";

describe("BT17-048 Argomon — [On Deletion] play Lv.6 Argomon (KB Q2800)", () => {
  it("matches the catalog identity and all three printed evolution/effect routes", async () => {
    expect(getCardDefinition("BT17-048")).toMatchObject({
      cardId: "BT17-048",
      colors: ["Green", "Purple"],
      level: 5,
      playCost: 8,
      dp: 7000,
      evoCosts: [
        { color: "Green", level: 4, memoryCost: 5 },
        { color: "Purple", level: 4, memoryCost: 5 },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Argomon"], level: 4, cost: 4, isAlternate: true },
    ]);
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldDigivolve",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 1,
          cost: { kind: "suspend", target: { filter: { kind: ["Tamer"] }, count: 5, upTo: true } },
        },
      ],
    });
  });

  it("reduces its own digivolution cost once per suspended Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-045", as: "base" },
            { card: "BT1-087", as: "firstTamer" },
            { card: "BT12-092", as: "secondTamer" },
          ],
          hand: [{ card: ARGOMON_LV5, as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === ARGOMON_LV5);

    expect(s.state.memory).toBe(0);
    expect(s.perm("firstTamer").isSuspended).toBe(true);
    expect(s.perm("secondTamer").isSuspended).toBe(true);
  });

  // Coordinator route decision: the printed "[Digivolve]Lv.4 [Argomon]: Cost 4" is exact-name
  // (namesExact), so the alternate cost-4 route is honored only from a base named exactly
  // "Argomon". A near-name base (Gargomon, whose name contains "argomon") must fall back to the
  // catalog Lv.4 route (cost 5). Per the harness trap, useAlternateCost is a selector, not an
  // assertion, so the proof is the memory delta, not { ok: true }.
  it("honors the alternate cost-4 route only from an exact [Argomon] base (namesExact)", async () => {
    const evolve = async (base: string, expectedMemory: number) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: base, as: "base" }],
            hand: [{ card: ARGOMON_LV5, as: "evolving" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 8;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("evolving").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === ARGOMON_LV5);
      expect(s.state.memory).toBe(expectedMemory);
    };

    // Base "Argomon" (BT17-045): alternate route, cost 4, no Tamers → 8 - 4 = 4.
    await evolve("BT17-045", 4);
    // Base "Gargomon" (BT17-046, Lv.4 Green/Purple): near-name, alternate route refused, falls
    // back to the catalog Lv.4 route, cost 5, no Tamers → 8 - 5 = 3.
    await evolve("BT17-046", 3);
  });

  it("prevents all opposing Tamers from unsuspending during the opponent's turn", async () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: "all" },
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
    });
  });

  it("keeps opposing Tamers suspended through the opponent's unsuspend phase, but not their Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: ARGOMON_LV5, as: "argomon" }] },
        1: {
          battleArea: [
            { card: "BT1-087", suspended: true, as: "oppTamer" },
            { card: "BT1-009", suspended: true, as: "oppDigimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(s.perm("oppTamer"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("oppDigimon"), "unsuspend")).toBe(false);

    const unsuspendedIds = await (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase(1);

    expect(s.perm("oppTamer").isSuspended).toBe(true);
    expect(unsuspendedIds).not.toContain(s.perm("oppTamer").permanentId);
    // Control: the restriction is Tamer-scoped, so an opposing Digimon still unsuspends.
    expect(s.perm("oppDigimon").isSuspended).toBe(false);
    expect(unsuspendedIds).toContain(s.perm("oppDigimon").permanentId);
  });

  it("with 3 Argomon in trash before deletion, the deleted card counts → 4 total, condition met", async () => {
    // Put 3 Argomon in trash (they count toward the threshold).
    // Put a Lv.6 Argomon in hand.
    // Set up the Argomon Lv.5 on the field so it can be deleted.
    // We need an opponent digivolve to trigger BT17-010 (Growlmon) [When Digivolving]
    // which deletes opponent Digimon with ≤4000 DP.
    // BT1-009 (Monodramon) is Lv.3 Red — valid base for Growlmon (Lv.4, evo from Lv.3 Red, cost 2).
    const s = setupEngine(
      {
        0: {
          trash: [ARGOMON_LV5, ARGOMON_LV5, ARGOMON_LV5],
          hand: [{ card: ARGOMON_LV6, as: "lv6Argomon" }],
          battleArea: [{ card: ARGOMON_LV5, dp: 3000, as: "argomon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 1000, as: "oppBase" }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    expect(p0.trash).toHaveLength(3);

    const argomonPermId = s.perm("argomon").permanentId;
    const lv6ArgomonId = s.inst("lv6Argomon").instanceId;
    const oppBasePermId = s.perm("oppBase").permanentId;
    const growlmonId = s.inst("growlmon").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 5;

    const res = s.engine.applyIntent(1, {
      type: "digivolve",
      instanceId: growlmonId,
      permanentId: oppBasePermId,
    });
    expect(res.ok).toBe(true);

    await settle(() => {
      // Wait until: Argomon no longer in battle area.
      const argomonInField = p0.battleArea.some((perm) => perm.permanentId === argomonPermId);
      return !argomonInField;
    }, 600);

    // Argomon was deleted — KB Q2800: the 4 in trash (3 pre-existing + 1 just deleted)
    // should trigger the [On Deletion] to offer playing the Lv.6 Argomon.
    // With auto-accept, the Lv.6 Argomon should be on the field.
    await settle(() => {
      const lv6InField = p0.battleArea.some((perm) => perm.topCard?.cardId === ARGOMON_LV6);
      const lv6InHand = p0.hand.some((c) => c.instanceId === lv6ArgomonId);
      return lv6InField || !lv6InHand;
    }, 600);

    const lv6IsOnField = p0.battleArea.some((perm) => perm.topCard?.cardId === ARGOMON_LV6);
    expect(lv6IsOnField).toBe(true);
  });

  it("naturally unsuspends its host after attacking by suspending Rhythm", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-051", dp: 12000, under: [{ card: ARGOMON_LV5 }], as: "host" },
            { card: "BT17-089", as: "rhythm" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rhythm").isSuspended);

    expect(s.perm("rhythm").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false);
  });

  // Q2799: the up-to-5-Tamers suspend cost may target EITHER player's Tamers. The IR filter is
  // { kind: ["Tamer"] } with no controller, so with only an opposing Tamer available the cost
  // suspends it and still reduces the digivolution cost by 1.
  it("Q2799 suspends an opposing Tamer for the digivolution-cost reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-045", as: "base" }],
          hand: [{ card: ARGOMON_LV5, as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-087", as: "oppTamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === ARGOMON_LV5);

    // Normal Lv.4 route costs 5; suspending the one opposing Tamer reduces it to 4 → 8 - 4 = 4.
    expect(s.perm("oppTamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  // Inherited [Once Per Turn]: the unsuspend fires on the first attack, is refused on a second
  // attack the same turn even though a spare [Rhythm] is still available, and resets on the
  // controller's next turn — driven through the real turn loop (runOneTurn / runTurn).
  it("inherited unsuspend is once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-051", dp: 12000, under: [{ card: ARGOMON_LV5 }], as: "host" },
            { card: "BT17-089", as: "rhythmA" },
            { card: "BT17-089", as: "rhythmB" },
          ],
          hand: [{ card: "BT1-009" }, { card: "BT1-009" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          // A body gives seat 1 a legal main action so its turn opens an observable Main phase
          // (an empty-board opponent auto-ends Main before the turn helper can catch it).
          battleArea: [{ card: "BT1-009", dp: 3000, as: "oppBody" }],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();

    const suspendedRhythms = () => [s.perm("rhythmA"), s.perm("rhythmB")].filter((perm) => perm.isSuspended).length;
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });

    // Turn 1 (seat 0).
    const turn1 = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    // First attack: the inherited effect suspends one Rhythm and leaves the host unsuspended.
    expect(attack()).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended && suspendedRhythms() === 1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(suspendedRhythms()).toBe(1);

    // Second attack same turn: once-per-turn is spent, so the host stays suspended even though
    // the spare Rhythm is still unsuspended (proving refusal, not cost exhaustion).
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(suspendedRhythms()).toBe(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn1;

    // `runOneTurn` runs exactly one turn and stops at End; only the production `run()` loop hands
    // the turn over. Emulate its `passTurn` between turns: flip the seat and re-frame the gauge.
    const passTurn = () => {
      s.state.turnSeat = (1 - s.state.turnSeat) as Seat;
      s.state.memory = -s.state.memory;
    };

    // Turn 2 (seat 1): a real opponent turn between mine.
    passTurn();
    await advance(s.engine).runTurn(1);

    // Turn 3 (seat 0): its real unsuspend phase readies the host and the once-per-turn frequency
    // resets at the owner-turn-start boundary.
    passTurn();
    const turn3 = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);

    // Third attack: the inherited effect fires again, proving the reset.
    expect(attack()).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended && suspendedRhythms() >= 1);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(suspendedRhythms()).toBeGreaterThanOrEqual(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn3;
  });
});
