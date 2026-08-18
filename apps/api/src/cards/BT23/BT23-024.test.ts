import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  EffectDuration,
  type CompiledCard,
  type Seat,
} from "@aegis/shared";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { irCardModule } from "../../engine/effects/interpreter.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js"; // register compiled cards so real recompute + combat run

/**
 * A3 for BT23-024 — suspend-restriction-with-superlative-exception (wires the formerly
 * dead "suspend" RestrictionKind to a consume-site).
 *
 * Card [All Turns]: "When this Digimon gets linked, by unsuspending it, other than their
 * highest play cost Digimon, none of your opponent's Digimon can suspend until their turn ends."
 *
 * Two halves, both fails-when-reverted:
 *   1. CARD -> ENGINE wiring: the IR `ArmSuspendRestriction` action calls the engine
 *      `armSuspendRestrictionSource` primitive (recording-fake dispatch).
 *   2. ENGINE consume-site + superlative recompute: with an armed source, the continuous
 *      recompute restricts every opponent Digimon EXCEPT the highest-play-cost one; the
 *      PRODUCTION attack-declaration path rejects a tapping attack by a restricted Digimon
 *      and allows the exempt one. Playing a higher-cost Digimon re-derives the exempt set
 *      (Q5250); the recompute is idempotent (CR-01).
 *
 * FAILS-WHEN-REVERTED levers (documented inline at each assertion).
 */

function ledger(s: EngineSetup): ContinuousEffectLedger {
  return (s.engine as unknown as { continuous: ContinuousEffectLedger }).continuous;
}

async function recompute(s: EngineSetup): Promise<void> {
  await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
}

// Real-cost cards (play cost from cards.json): pick by needed cost at lookup time.
// We rely on the production card DB so playCost is authoritative.

describe("BT23-024 — IR ArmSuspendRestriction dispatches to the engine armed-source primitive", () => {
  it("the [All Turns] ArmSuspendRestriction action calls armSuspendRestrictionSource on the source", async () => {
    const calls: { verb: string; args: unknown[] }[] = [];
    const fx = {
      armSuspendRestrictionSource: (...a: unknown[]) => calls.push({ verb: "armSuspendRestrictionSource", args: a }),
    } as unknown as Primitives;
    const source = {
      instanceId: "INST#1",
      cardId: "BT23-024",
      ownerSeat: 0 as Seat,
      definition: { cardId: "BT23-024" } as never,
      permanent: () => ({ permanentId: "SELF#1" }) as never,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    } as CardSource;
    const ctx = {
      source,
      trigger: {},
      game: {} as never,
      fx,
      ask: {} as never,
      selections: new Map<string, string>(),
    } as EffectContext;

    const compiled: CompiledCard = {
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [{ kind: "ArmSuspendRestriction", duration: "untilOpponentTurnEnd" } as never],
        },
      ],
    } as CompiledCard;
    const effects = irCardModule("X-ARM", compiled).effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    const armed = calls.filter((c) => c.verb === "armSuspendRestrictionSource");
    expect(armed).toHaveLength(1);
    expect(armed[0]!.args[0]).toBe("SELF#1");
    expect(armed[0]!.args[1]).toBe(EffectDuration.UntilOpponentTurnEnd);
    // REVERT-CONFIRM-RED: remove the `ctx.fx.armSuspendRestrictionSource?.(...)` call in the
    // interpreter's "ArmSuspendRestriction" case => armed is empty => this assertion goes RED.
  });
});

describe("BT23-024 — armed suspend restriction with the highest-play-cost exception", () => {
  it("restricts every opponent Digimon EXCEPT the highest play cost; recomputes on a higher play", async () => {
    // Seat-0 controls BT23-024 (the armer). Seat-1 (the active turn player) has a cost-5 and a
    // cost-6 Digimon. Real cards chosen for their play cost (from cards.json):
    //   AD1-001 (play cost 5), BT1-019 (play cost 6), AD1-003 (play cost 7).
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-024", dp: 3000, as: "armer" }] },
      1: {
        battleArea: [
          { card: "AD1-001", dp: 4000, as: "cost5" },
          { card: "BT1-019", dp: 6000, as: "cost6" },
        ],
      },
    });
    s.state.turnSeat = 1; // seat-1 (the opponent of the BT23-024 controller) is the active attacker
    const armerId = s.perm("armer").permanentId;
    const cost5Id = s.perm("cost5").permanentId;
    const cost6Id = s.perm("cost6").permanentId;

    // Arm via the real engine primitive (the IR action's target; proven to be called above).
    ledger(s).armSuspendRestrictionSource(armerId, EffectDuration.UntilOpponentTurnEnd);
    await recompute(s);

    // The cost-5 is restricted; the cost-6 (highest) is exempt (Q5247).
    expect(ledger(s).hasRestriction(cost5Id, "suspend")).toBe(true);
    expect(ledger(s).hasRestriction(cost6Id, "suspend")).toBe(false);

    // Play a cost-7 Digimon for seat-1: it becomes the highest, so the cost-6 is now restricted
    // and the cost-7 is exempt (Q5250 recompute).
    const cost7 = s.putOnBoard(1, { card: "AD1-003", dp: 11000 });
    await recompute(s);
    expect(ledger(s).hasRestriction(cost6Id, "suspend")).toBe(true);
    expect(ledger(s).hasRestriction(cost7.permanentId, "suspend")).toBe(false);
    expect(ledger(s).hasRestriction(cost5Id, "suspend")).toBe(true);

    // Idempotence (CR-01): a second recompute leaves the set stable (no accumulation, no flip).
    await recompute(s);
    expect(ledger(s).hasRestriction(cost6Id, "suspend")).toBe(true);
    expect(ledger(s).hasRestriction(cost7.permanentId, "suspend")).toBe(false);

    // PRODUCTION attack path (asserted last so launching combat can't perturb the ledger reads
    // above): declaring a tapping attack requires suspending the attacker. The cost-6 (now
    // restricted) is rejected; the cost-7 (exempt) is allowed. Target the player (always legal).
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: cost6Id,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    // REVERT-CONFIRM-RED: drop the `hasRestriction(attacker, "suspend")` consult in
    // combat/legality.canAttackerDeclare => the cost-6 attack returns { ok: true } => RED.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: cost7.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("exempts EVERY Digimon tied for the highest play cost (Q5249 'either can be suspended')", async () => {
    // Two cost-6 Digimon (BT1-019) tie for the highest play cost; a cost-5 (AD1-001) is below.
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-024", dp: 3000, as: "armer" }] },
      1: {
        battleArea: [
          { card: "BT1-019", dp: 6000, as: "tiedA" },
          { card: "BT1-019", dp: 6000, as: "tiedB" },
          { card: "AD1-001", dp: 4000, as: "below" },
        ],
      },
    });
    s.state.turnSeat = 1;
    const armerId = s.perm("armer").permanentId;
    const tiedAId = s.perm("tiedA").permanentId;
    const tiedBId = s.perm("tiedB").permanentId;
    const belowId = s.perm("below").permanentId;

    ledger(s).armSuspendRestrictionSource(armerId, EffectDuration.UntilOpponentTurnEnd);
    await recompute(s);

    // Both cost-6 Digimon are exempt (the tie); only the cost-5 is restricted.
    expect(ledger(s).hasRestriction(tiedAId, "suspend")).toBe(false);
    expect(ledger(s).hasRestriction(tiedBId, "suspend")).toBe(false);
    expect(ledger(s).hasRestriction(belowId, "suspend")).toBe(true);
    // REVERT-CONFIRM-RED: exempting only ONE tied member (a single-id exemption) =>
    // one of tiedA/tiedB is restricted => RED.
  });
});
