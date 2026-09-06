import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-091.js";
import "./index.js";

// A3 for BT20-091 (Cool Boy) — [Your Turn] Tamer: when your Digimon are played or
// digivolve, if any of them have the [Royal Knight] trait, by suspending this Tamer,
// <Draw 1> and gain 1 memory.
//
// FAILS-WHEN-REVERTED: with BT20-091 on the battle area, firing OnEnterFieldAnyone
// with a [Royal Knight] trait Digimon as the subject draws a card and gains 1 memory.
// Without the hand-written module, the IRStub has a RawUnparsed clause and does nothing.
// Two proofs:
//   1. Positive: Royal Knight subject → draw 1 + gain 1 memory.
//   2. Negative: non-Royal Knight subject → no draw, no memory change.

// AD1-008 (Gallantmon) has types: ["Holy Warrior", "Royal Knight"].
// BT3-073 (WereGarurumon) has types: ["Warrior", "Virus"] — no Royal Knight.
const ROYAL_KNIGHT_CARD = "AD1-008"; // Gallantmon — Royal Knight trait
const NON_ROYAL_KNIGHT_CARD = "BT3-073"; // WereGarurumon — no Royal Knight
const COOL_BOY = "BT20-091";
const OMEKAMON = "BT20-083"; // Omekamon printing

function fireTiming(s: EngineSetup, timing: EffectTiming, trigger: Record<string, unknown> = {}): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, trigger);
}

function fireSubTrigger(
  s: EngineSetup,
  event: "whenPlayed" | "whenOneOfYoursDigivolves",
  subjectPermanentId: string,
): Promise<void> {
  return (
    s.engine as unknown as {
      fireSubTrigger(e: string, trigger: Record<string, unknown>): Promise<void>;
    }
  ).fireSubTrigger(event, { subjectPermanentId });
}

describe("BT20-091 [Your Turn] when Royal Knight played/digivolves, suspend to draw+memory", () => {
  it("encodes all printed clauses without residuals", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed" },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          sourceFilter: { zone: "battleArea", nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
        },
      ],
    });
    for (const watcher of compiled.effects[0]?.actions ?? []) {
      expect((watcher as { actions?: unknown[] }).actions).toMatchObject([
        { kind: "Draw", cost: { kind: "suspend", target: { isSelf: true } }, abortOnDecline: true },
        { kind: "GainMemory", condition: { kind: "ifThisEffectActed" } },
      ]);
    }
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("draws 1 and gains 1 memory when a [Royal Knight] Digimon enters the field", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          // Cool Boy (the Tamer), unsuspended.
          { card: COOL_BOY, dp: 0, as: "coolBoy" },
          // A [Royal Knight] Digimon enters the field (the OnEnterFieldAnyone subject).
          { card: ROYAL_KNIGHT_CARD, dp: 10000, as: "royalKnight" },
        ],
        // A card in deck to draw.
        deck: [{ card: "BT1-001", faceUp: false }],
      },
    });
    const p0 = s.state.players[0];
    s.state.turnSeat = 0;
    const royalKnightId = s.perm("royalKnight").permanentId;

    const memBefore = s.state.memory;
    const handBefore = p0?.hand.length ?? 0;
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();

    await fireSubTrigger(s, "whenPlayed", royalKnightId);
    for (let i = 0; i < 400 && (p0?.hand.length ?? 0) <= handBefore; i++) await Promise.resolve();

    // Cool Boy should be suspended (activation cost paid).
    expect(s.perm("coolBoy").isSuspended).toBe(true);
    // Draw 1: one card moved from deck to hand.
    expect(p0?.hand.length).toBe(handBefore + 1);
    expect(p0?.deck.length).toBe(0);
    // Gain 1 memory.
    expect(s.state.memory).toBe(memBefore + 1);
  });

  it("does NOT draw when the Digimon has no [Royal Knight] trait (negative control)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: COOL_BOY, dp: 0, as: "coolBoy" },
          { card: NON_ROYAL_KNIGHT_CARD, dp: 6000, as: "nonRoyalKnight" },
        ],
        deck: [{ card: "BT1-001", faceUp: false }],
      },
    });
    const p0 = s.state.players[0];
    s.state.turnSeat = 0;
    const nonRoyalKnightId = s.perm("nonRoyalKnight").permanentId;

    const memBefore = s.state.memory;
    const handBefore = p0?.hand.length ?? 0;
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();

    await fireSubTrigger(s, "whenPlayed", nonRoyalKnightId);
    for (let i = 0; i < 50; i++) await Promise.resolve();

    // No draw, no memory change.
    expect(p0?.hand.length).toBe(handBefore);
    expect(s.state.memory).toBe(memBefore);
    // Cool Boy not suspended.
    expect(s.perm("coolBoy").isSuspended).toBe(false);
  });
});

// A3 for BT20-091's [Opponent's Turn][Once Per Turn] leave-play clause: "When any of your
// Digimon with the [Royal Knight] trait would leave the battle area, you may play 1
// [Omekamon] from your hand without paying the cost."
//
// FAILS-WHEN-REVERTED: with BT20-091 on the battle area (subscription installed when it
// entered) and a [Royal Knight] Digimon deleted on the opponent's turn, Omekamon is played
// from hand for free. Reverting either the `mode: "instead"` dispatch in leavePrevention.ts
// or this card's `subscribeReplacement` install makes the clause inert — the leaving
// permanent still dies (rule DP-0 deletion), but Omekamon never enters play.
describe("BT20-091 [Opponent's Turn][Once Per Turn] play Omekamon when a Royal Knight leaves", () => {
  it("plays Omekamon from hand when a [Royal Knight] Digimon is deleted on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: COOL_BOY, dp: 0, as: "coolBoy" },
            { card: ROYAL_KNIGHT_CARD, dp: 5000, as: "royalKnight" },
          ],
          hand: [{ card: OMEKAMON, as: "omekamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const royalKnightId = s.perm("royalKnight").permanentId;
    const omekamonInstanceId = s.inst("omekamon").instanceId;

    // Install the subscription: Cool Boy itself enters the field.
    await fireTiming(s, EffectTiming.OnEnterFieldAnyone, {
      subjectPermanentId: s.perm("coolBoy").permanentId,
    });
    for (let i = 0; i < 50; i++) await Promise.resolve();

    // Now the opponent's turn; the Royal Knight is reduced to 0 DP (a rule-based deletion).
    s.state.turnSeat = 1;
    s.perm("royalKnight").currentDP = 0;
    s.perm("royalKnight").baseDP = 0;

    // Any fireTiming call opens a window and runs the leading rule-process sweep first,
    // which deletes the 0-DP Digimon and — via the now-live "instead" dispatch — consults
    // the installed leave-play replacement.
    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 400 && (p0?.hand.some((c) => c.instanceId === omekamonInstanceId) ?? true); i++) {
      await Promise.resolve();
    }

    // The Royal Knight actually left (the "instead" reaction does NOT prevent the leave).
    expect(p0?.battleArea.some((p) => p.permanentId === royalKnightId)).toBe(false);
    // Omekamon was played from hand without paying its cost — no longer in hand, now on the
    // battle area.
    expect(p0?.hand.some((c) => c.instanceId === omekamonInstanceId)).toBe(false);
    expect(p0?.battleArea.some((p) => p.topCard?.cardId === OMEKAMON)).toBe(true);
  });

  it("does NOT play Omekamon on the [Royal Knight]'s OWN controller's turn (opponent's-turn gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: COOL_BOY, dp: 0, as: "coolBoy" },
            { card: ROYAL_KNIGHT_CARD, dp: 5000, as: "royalKnight" },
          ],
          hand: [{ card: OMEKAMON, as: "omekamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const royalKnightId = s.perm("royalKnight").permanentId;
    const omekamonInstanceId = s.inst("omekamon").instanceId;

    await fireTiming(s, EffectTiming.OnEnterFieldAnyone, {
      subjectPermanentId: s.perm("coolBoy").permanentId,
    });
    for (let i = 0; i < 50; i++) await Promise.resolve();

    // Still seat 0's own turn (the default) when the Royal Knight is deleted.
    s.perm("royalKnight").currentDP = 0;
    s.perm("royalKnight").baseDP = 0;

    await fireTiming(s, EffectTiming.OnStartMainPhase, {});
    for (let i = 0; i < 50; i++) await Promise.resolve();

    expect(p0?.battleArea.some((p) => p.permanentId === royalKnightId)).toBe(false);
    // Omekamon stayed in hand: the clause is [Opponent's Turn] only.
    expect(p0?.hand.some((c) => c.instanceId === omekamonInstanceId)).toBe(true);
  });
});

describe("BT20-091 Security deployment", () => {
  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
      1: { security: [{ card: COOL_BOY, as: "securityCoolBoy" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === COOL_BOY));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === COOL_BOY)).toBe(true);
  });
});
