import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import type { ModifierLedger } from "../../engine/effects/modifiers.js";
import type { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
// Self-register every compiled-IR / hand-written card module so EX11-070's real IR resolves.
import "../index.js";

/**
 * Phase 8 A3 — EX11-070 dp-floor-and-stacked-trash-lock (PRIM-01).
 *
 * EX11-070 [Unchained]'s [All Turns] inherited (ESS) static (documented behavior) confers TWO
 * continuous rules on its HOST Digimon while EX11-070 sits in the host's digivolution stack and
 * the host's top card has [Maquinamon] in its text:
 *   (1) DP-FLOOR — "can't have less than 1000 DP", applied AFTER all +/- changes (KB Q5941:
 *       5000 +2000 −7000 → clamped to 1000, NOT a per-change clamp).
 *   (2) STACKED-TRASH-LOCK — "your opponent's effects can't trash this Digimon's stacked cards"
 *       (KB Q5943); the controller's OWN effects still trash.
 *
 * Host vehicle: Turbomon (EX11-029, base DP 5000, has [Maquinamon] in its text). Both rules are
 * installed by the real continuous-recompute pass firing EX11-070's [All Turns] static — no
 * synthetic ledger writes; the proof drives the production seams.
 *
 * FAILS-WHEN-REVERTED levers (per case below):
 *   - DP-floor: drop `applyDpFloor` in ModifierLedger.recomputeDP (or the floor branch in rawDp)
 *     => the host's DP drops to 0 instead of clamping to 1000 => RED.
 *   - trash-lock: drop the `stackTrashLocked` consult in trashDigivolutionCards/deDigivolve
 *     => the opponent's trash succeeds => RED.
 */

const HOST_MAQUINAMON_TEXT = "EX11-029"; // Turbomon — base DP 5000, [Maquinamon] in text
const HOST_BASE_DP = 5000;
const NON_MAQUINAMON = "BT1-009"; // a Digimon with no [Maquinamon] in its text (control host)
const ESS_SOURCE = "EX11-070"; // Unchained — the inherited [All Turns] dp-floor / trash-lock source
const FILLER_STACK = "BT1-019"; // any card to sit as an additional digivolution-stack card

const modifiersOf = (s: EngineSetup): ModifierLedger =>
  (s.engine as unknown as { modifiers: ModifierLedger }).modifiers;
const continuousOf = (s: EngineSetup): ContinuousEffectLedger =>
  (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
const primitivesOf = (s: EngineSetup): Primitives =>
  (s.engine as unknown as { primitives: Primitives }).primitives;

describe("EX11-070 DP-floor — a [Maquinamon]-text host can't have less than 1000 DP (KB Q5941)", () => {
  it("a host driven below 1000 DP clamps to 1000 while EX11-070 is one of its digivolution cards", async () => {
    // Turbomon (5000 DP, [Maquinamon] in text) with EX11-070 as a digivolution card under it.
    const s = setupEngine({
      0: { battleArea: [{ card: HOST_MAQUINAMON_TEXT, dp: HOST_BASE_DP, as: "host", under: [ESS_SOURCE] }] },
    });
    const host = s.perm("host");

    // The real continuous-recompute pass fires EX11-070's [All Turns] static, installing the floor.
    await s.engine.recomputeContinuousEffects();
    expect(modifiersOf(s).minDpFloorsOf(host.permanentId).length).toBeGreaterThan(0);

    // Drive the host below the floor: −5000 onto a 5000-DP host → computed 0, AFTER all changes.
    modifiersOf(s).addDpModifier(s.state, host.permanentId, -5000, EffectDuration.UntilEachTurnEnd);

    // KB Q5941: the floor clamps the after-all-changes value to 1000 (not 0).
    // FAILS-WHEN-REVERTED: drop applyDpFloor in recomputeDP => currentDP would be 0.
    expect(host.currentDP).toBe(1000);
    // The state-based-action raw value is ALSO floored (a floored Digimon is not deleted at 0 DP).
    // FAILS-WHEN-REVERTED: drop the floor branch in rawDp => rawDp would be 0 (deletion).
    expect(modifiersOf(s).rawDp(s.state, host.permanentId)).toBe(1000);
  });

  it("the floor does NOT apply to a host whose top card lacks [Maquinamon] in its text (gate is real)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: NON_MAQUINAMON, dp: 3000, as: "host", under: [ESS_SOURCE] }] },
    });
    const host = s.perm("host");

    await s.engine.recomputeContinuousEffects();
    expect(modifiersOf(s).minDpFloorsOf(host.permanentId).length).toBe(0);

    modifiersOf(s).addDpModifier(s.state, host.permanentId, -5000, EffectDuration.UntilEachTurnEnd);
    // No floor → the base 0-clamp applies (no Maquinamon gate satisfied).
    expect(host.currentDP).toBe(0);
  });
});

describe("EX11-070 stacked-trash-lock — opponent effects can't trash the host's stacked cards (KB Q5943)", () => {
  it("an opponent effect cannot trash the host's stacked card, but the controller's own effect can", async () => {
    // Host with EX11-070 (bottom) + a filler digivolution card (the trash target) on top.
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: HOST_MAQUINAMON_TEXT,
            dp: HOST_BASE_DP,
            as: "host",
            under: [ESS_SOURCE, { card: FILLER_STACK, as: "filler" }],
          },
        ],
      },
    });
    const host = s.perm("host");
    const fillerId = s.inst("filler").instanceId;

    await s.engine.recomputeContinuousEffects();
    expect(continuousOf(s).stackTrashLocked(host.permanentId)).toBe(true);

    // OPPONENT (seat 1) effect tries to trash the host's stacked filler card → BLOCKED (Q5943).
    // FAILS-WHEN-REVERTED: drop the stackTrashLocked consult in trashDigivolutionCards =>
    // the opponent trash succeeds (moved.length === 1, stack shrinks) => RED.
    const blocked = await primitivesOf(s).trashDigivolutionCards(host.permanentId, [fillerId], {
      byEffectSeat: 1,
    });
    expect(blocked.length).toBe(0);
    expect(host.stack.some((c) => c.instanceId === fillerId)).toBe(true);

    // The CONTROLLER's OWN effect (seat 0) trashes it (the lock is opponent-scoped; documented behavior
    // EffectCondition = IsOpponentEffect).
    const own = await primitivesOf(s).trashDigivolutionCards(host.permanentId, [fillerId], {
      byEffectSeat: 0,
    });
    expect(own.length).toBe(1);
    expect(host.stack.some((c) => c.instanceId === fillerId)).toBe(false);
  });

  it("an opponent <De-Digivolve> cannot strip a locked host's source (Q5943 names De-Digivolve)", async () => {
    // Host with a real source beneath the top so a <De-Digivolve> would otherwise demote it.
    const s = setupEngine({
      0: { battleArea: [{ card: HOST_MAQUINAMON_TEXT, dp: HOST_BASE_DP, as: "host", under: [ESS_SOURCE] }] },
    });
    const host = s.perm("host");
    const stackSizeBefore = host.stack.length;

    await s.engine.recomputeContinuousEffects();
    expect(continuousOf(s).stackTrashLocked(host.permanentId)).toBe(true);

    // OPPONENT (seat 1) <De-Digivolve 1> → blocked; the stack is untouched.
    // FAILS-WHEN-REVERTED: drop the stackTrashLocked consult in deDigivolve => the opponent
    // De-Digivolve pops a source (moved.length === 1) => RED.
    const moved = primitivesOf(s).deDigivolve(host.permanentId, 1, { byEffectSeat: 1 });
    expect(moved.length).toBe(0);
    expect(host.stack.length).toBe(stackSizeBefore);
  });
});

describe("EX11-070 inherited End of All Turns play", () => {
  it("offers an Unchained in the host's stack as a free play", async () => {
    const host = setupEngine({
      0: { battleArea: [{ card: HOST_MAQUINAMON_TEXT, as: "host", under: [ESS_SOURCE] }] },
    }).perm("host");
    const source = {
      instanceId: host.stack[0]!.instanceId,
      cardId: ESS_SOURCE,
      ownerSeat: 0,
      definition: undefined,
      permanent: () => host,
      isOnBattleArea: () => true,
      isOwnersTurn: () => false,
      hasColor: () => true,
    } as never;
    const effect = getEffectModule(ESS_SOURCE)!.effectsForTiming(EffectTiming.OnEndTurn, source)[1]!;
    const played: string[][] = [];
    await effect.resolve({
      source,
      trigger: {},
      game: { definitionOf: (card: { cardId: string }) => ({ nameEn: card.cardId === ESS_SOURCE ? "Unchained" : "Turbomon" }) },
      fx: { playInstances: async (ids: string[]) => { played.push(ids); return []; } },
      ask: { selectCards: async (_ctx: unknown, options: { candidates: string[] }) => options.candidates.slice(0, 1) },
    } as never);
    expect(played).toEqual([[host.stack[0]!.instanceId]]);
  });
});
