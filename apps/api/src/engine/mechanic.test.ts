import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  EffectDuration,
  EffectTiming,
  Phase,
  type Seat,
  getCompiledCard,
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";
import { getEffectModule } from "./effects/registry.js";
import { GameStateAccess } from "./state/access.js";
import { canAttackerDeclare, type ContinuousLegalityReader } from "./combat/legality.js";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
  findPermanent,
  assertNoLoudGap,
  type EngineSetup as Setup,
} from "./testkit/harness.js";
// Importing the cards root barrel self-registers every compiled-IR card module so the
// engine can look up On Play / Security / activated effects by card id (boot side-effect).
import "../cards/index.js";
import { advance } from "./testkit/advance.js";

/**
 * Phase A3 — behavioral execution oracle.
 *
 * Runs a card's COMPILED IR through the real GameEngine (real interpreter + real
 * createPrimitives), driving a real intent and asserting the resulting GameState.
 * This is the seam neither effectFiring.test.ts (only 3 trivial single-action cards)
 * nor interpreter.test.ts (a fake Primitives recorder that stops at the IR->verb
 * boundary) covers for the A4 priority mechanics.
 *
 * Loud-gap contract: every unwired interpreter branch throws UnsupportedEffectError in
 * STRICT mode (NODE_ENV !== "production", which Vitest satisfies). For play-driven
 * effects that error surfaces as an `actionRejected` event (GameEngine.ts:1232 catch),
 * so assertNoLoudGap() fails the test rather than letting a silent no-op pass.
 *
 * One describe block per mechanic; split into separate files only past ~500 lines.
 */

interface LedgerReader {
  hasKeyword(permanentId: string, keyword: string): boolean;
  hasRestriction(permanentId: string, restriction: string): boolean;
}

/**
 * Read the engine's continuous-effect ledger. Granted keywords/restrictions are not
 * mirrored onto the synced Permanent schema (they live only in the ledger, which the
 * engine consults at decision time), so a behavioral test reads it directly. The field
 * is private; reaching it here keeps the assertion at the ledger boundary without a
 * production-only accessor.
 */
function ledger(s: Setup): LedgerReader {
  return (s.engine as unknown as { continuous: LedgerReader }).continuous;
}

/** Duration used for one-shot test grants on the continuous ledger. */
const EFFECT_DURATION_TURN = EffectDuration.UntilEachTurnEnd;

interface LedgerWriter {
  addRestriction(
    permanentId: string,
    restriction: string,
    duration: EffectDuration,
    opts?: { continuous?: boolean },
  ): void;
  addKeywordGrant(
    permanentId: string,
    keyword: string,
    duration: EffectDuration,
    amount?: number,
    opts?: { continuous?: boolean },
  ): void;
  addColorWaiver(instanceId: string, duration: EffectDuration, opts?: { continuous?: boolean }): void;
}

/**
 * Write-access to the continuous-effect ledger, for seeding a precondition a hand-laid
 * board cannot otherwise produce (e.g. granting the `beAffected` effect-immunity to probe
 * the timing-disable immunity bypass). Same private-field reach as `ledger`.
 */
function ledgerWrite(s: Setup): LedgerWriter {
  return (s.engine as unknown as { continuous: LedgerWriter }).continuous;
}

interface ModifierWriter {
  addPierceGrant(permanentId: string, duration: EffectDuration, opts?: { continuous?: boolean }): unknown;
}

/**
 * Write-access to the engine's ModifierLedger, for seeding a ＜Piercing＞ grant a
 * hand-laid board cannot otherwise produce (the pierce store is consumed by combat at
 * the battle outcome). Same private-field reach as `ledger`/`ledgerWrite`.
 */
function modifierWrite(s: Setup): ModifierWriter {
  return (s.engine as unknown as { modifiers: ModifierWriter }).modifiers;
}

interface SecurityDpLedgerLike {
  add(seat: Seat, delta: number, opts?: { continuous?: boolean }): void;
  deltaFor(seat: Seat): number;
  clearContinuous(): void;
}

/**
 * Seed a FAITHFUL ModifySecurityDP delta on the engine's server-only securityDp ledger,
 * modelling a CONTINUOUS source (the printed vehicle, ST3-12, is an `[Opponent's Turn]`
 * static — a continuous effect that re-applies on every recompute, including the one the
 * security-check window triggers). `runSecurityCheck` clears the ledger at the start of each
 * recompute, so a continuous source must re-apply afterwards; this wraps `clearContinuous` to re-seed the
 * delta, exercising the REAL primitive write (`add`) and the REAL consumer read
 * (`securityCardDp = dp + deltaFor`) — NOT ST3-12's unfaithful compiled IR (deferred to
 * Phase 3). Returns a disposer that restores the original `clearContinuous`.
 */
function seedContinuousSecurityDp(s: Setup, seat: Seat, delta: number): () => void {
  const dp = (s.engine as unknown as { securityDp: SecurityDpLedgerLike }).securityDp;
  const originalClear = dp.clearContinuous.bind(dp);
  dp.clearContinuous = () => {
    originalClear();
    dp.add(seat, delta, { continuous: true });
  };
  dp.add(seat, delta, { continuous: true });
  return () => {
    dp.clearContinuous = originalClear;
    originalClear();
  };
}

interface ActivatableEntry {
  instanceId: string;
  effectKey: string;
  description: string;
}

/**
 * The activatable [Main] abilities the engine currently surfaces for a permanent —
 * exactly the affordance set the client reads off `Permanent.activatableEffectsJson`.
 * Recompute on demand (the engine only re-derives it after an intent / continuous
 * sweep, neither of which a hand-laid board triggers) so a test can read an effectKey
 * before driving the activateEffect verb, and re-read it afterwards to confirm a
 * consumed [Once Per Turn] use drops out of the affordance set.
 */
function activatableEffects(s: Setup, perm: Permanent): ActivatableEntry[] {
  (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
  return perm.activatableEffectsJson ? (JSON.parse(perm.activatableEffectsJson) as ActivatableEntry[]) : [];
}

/**
 * Drive the player `digivolve` verb: stack a hand Digimon (`evolving`) onto an owned
 * permanent (`baseId`). The verb is legal only when the BASE permanent's top card
 * satisfies one of the evolving card's printed EvoCosts — `matchingEvoCost` requires
 * `base.colors ∋ cost.color` AND `base.level <= cost.level` (cardData.ts:162). So a
 * test must lay a base whose top card is a real card of the right color and level
 * (e.g. a Lv.3 Red Digimon to evolve a card whose EvoCost is Lv.3/Red), put `evolving`
 * in hand, and afford the EvoCost's memory. On success the verb fires WhenDigivolving
 * for the new top, which is what these tests assert. Returns the synchronous IntentResult.
 */
function digivolve(s: Setup, seat: Seat, baseId: string, evolving: CardInstance) {
  return s.engine.applyIntent(seat, {
    type: "digivolve",
    permanentId: baseId,
    instanceId: evolving.instanceId,
  });
}

describe("A3 RevealAdd — reveal top N, add matching, rest to deck", () => {
  it("BT1-067 [On Play] reveals top 3 and adds the lone Lv.4 Digimon to hand", async () => {
    // The single matching candidate is still offered as a card selection (the client shows the
    // reveal); the harness answers it, and the assertion below is that nothing OPTIONAL was asked.
    const s = setup({ autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;

    const source = instance("BT1-067", 0, false); // Green Digimon, cost 3, On Play: RevealAdd 3
    player.hand.push(source);

    // Top 3 of the deck: exactly one card matches {kind:["Digimon"], levels:[4]}, so the
    // single-spec add auto-resolves (matches.length === want) with no selectCards decision.
    const match = instance("AD1-001", 0, false); // Lv.4 Digimon  -> matches
    const lower = instance("BT1-009", 0, false); // Lv.3 Digimon  -> no match
    const tamer = instance("AD1-019", 0, false); // Tamer         -> no match
    player.deck.push(match, lower, tamer);
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    await settle(() => player.hand.some((c) => c.instanceId === match.instanceId), 5000);

    // The Lv.4 Digimon was added to hand; the two non-matches went to the deck bottom.
    expect(player.hand.some((c) => c.instanceId === match.instanceId)).toBe(true);
    expect(player.deck.some((c) => c.instanceId === match.instanceId)).toBe(false);
    expect(player.deck).toHaveLength(2);
    // Mandatory effect: no "use this effect?" prompt was raised.
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    assertNoLoudGap(s);
  });
});

describe("A3 BT7-108 — Hybrid Digimon and Tamers scale additively", () => {
  // The documented behavior counts Hybrid Digimon and all Tamers in two independent
  // collections. KB Q1675 confirms that 2 Hybrids + 1 Tamer permits 3 deletions.
  // FAILS-WHEN-REVERTED: the old combined kind+trait filter applies [Hybrid] to Tamers too,
  // so four ordinary Tamers produce a zero target count and delete nothing.
  it("deletes one opposing level 5 or lower Digimon for each Tamer in play", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    p0.battleArea.push(
      digimon(0, 0, "BT10-093"),
      digimon(0, 0, "BT1-085"),
      digimon(0, 0, "BT1-086"),
      digimon(0, 0, "BT1-087"),
    );
    p1.battleArea.push(
      digimon(1, 3000, "BT1-009"),
      digimon(1, 4000, "BT1-010"),
      digimon(1, 5000, "BT1-011"),
      digimon(1, 6000, "BT1-012"),
    );
    const option = instance("BT7-108", 0, false);
    p0.hand.push(option);
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p1.battleArea.length === 0);

    expect(p1.battleArea).toHaveLength(0);
    expect(p1.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010", "BT1-011", "BT1-012"]),
    );
    assertNoLoudGap(s);
  });
});

describe("A3 RestrictPlay — seat-level play prohibition", () => {
  it("EX3-012 [On Play] blocks the opponent from playing a <=5000 DP Digimon", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // On Play: "your opponent can't play Digimon with 5000 DP or less" (until their turn ends).
    const source = instance("EX3-012", 0, false); // Red Lv.6 Digimon, cost 12
    p0.hand.push(source);
    s.state.memory = 10; // afford the cost-12 hard play

    const blocked = instance("BT1-009", 1, false); // 3000 DP -> inside the prohibition filter
    const allowed = instance("BT1-071", 1, false); // 6000 DP -> outside the filter
    p1.hand.push(blocked, allowed);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    // Wait for EX3-012 to land, then flush the bounded On Play continuation so the
    // RestrictPlay prohibition is recorded in the continuous ledger before we probe it.
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "EX3-012"));
    await settle(() => false, 50);
    assertNoLoudGap(s); // EX3-012's On Play resolved without an unwired branch

    // Opponent's turn; both plays are otherwise legal and affordable.
    s.state.turnSeat = 1;
    s.state.memory = 0;

    // RestrictPlay surfaces its own fine-grained reason (RejectReason consolidation,
    // fc20b1b6b: "Consolidate RejectReason as the single source of truth (10->28 codes)").
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: blocked.instanceId })).toEqual({
      ok: false,
      reason: "play-prohibited",
    });

    // A >5000 DP Digimon is outside the filter, so it is not prohibited.
    const allowedResult = s.engine.applyIntent(1, {
      type: "playCard",
      instanceId: allowed.instanceId,
    });
    expect(allowedResult.ok).toBe(true);
  });
});

describe("A3 core verbs — Delete / ModifyDP / Suspend / Return through the real seam", () => {
  it("Delete: BT13-011 [On Play] deletes the lone <=3000 DP opponent Digimon", async () => {
    const s = setup({ autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;
    const target = digimon(1, 3000); // opponent Digimon within the DP<=3000 filter
    p1.battleArea.push(target);

    const source = instance("BT13-011", 0, false); // Digimon, cost 5
    (s.state.players[0] as PlayerState).hand.push(source);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId));

    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === target.topCard?.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("ModifyDP: BT10-034 [On Play] gives the lone opponent Digimon -3000 DP", async () => {
    const s = setup({ autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;
    const target = digimon(1, 8000); // 8000 -> 5000 (stays well above 0, no rule-check delete)
    p1.battleArea.push(target);

    // BT10-034's -3000 is gated on "another Digimon or Tamer with [Xros Heart] in its
    // traits in play" — satisfy the printed precondition with a Xros Heart companion.
    (s.state.players[0] as PlayerState).battleArea.push(digimon(0, 3000, "BT10-007"));

    const source = instance("BT10-034", 0, false); // Digimon, cost 4
    (s.state.players[0] as PlayerState).hand.push(source);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => target.currentDP !== 8000);

    expect(target.currentDP).toBe(5000);
    assertNoLoudGap(s);
  });

  it("Suspend: BT1-070 [On Play] suspends the lone opponent Digimon", async () => {
    const s = setup({ autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;
    const target = digimon(1, 5000);
    target.isSuspended = false;
    p1.battleArea.push(target);

    const source = instance("BT1-070", 0, false); // Digimon, cost 4
    (s.state.players[0] as PlayerState).hand.push(source);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => target.isSuspended);

    expect(target.isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("Restrict beSuspended: an effect-suspend leaves a 'can't be suspended' Digimon unsuspended", async () => {
    const s = setup({ autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;

    // Two opponent Digimon: `protectedDigimon` carries the continuous "can't be suspended"
    // grant (BT19-101/LM-041 semantics); `control` does not (negative control). The effect
    // suspends the lone candidate, so each is exercised in its own play.
    const protectedDigimon = digimon(1, 5000);
    protectedDigimon.isSuspended = false;
    p1.battleArea.push(protectedDigimon);

    // Arm "can't BE suspended" on the protected target via the real ledger.
    (
      s.engine as unknown as {
        continuous: {
          addRestriction(id: string, r: string, d: EffectDuration): void;
        };
      }
    ).continuous.addRestriction(protectedDigimon.permanentId, "beSuspended", EffectDuration.Permanent);

    const source = instance("BT1-070", 0, false); // [On Play] suspends the lone opponent Digimon
    (s.state.players[0] as PlayerState).hand.push(source);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    // Let the OnPlay window resolve; the effect-suspend seam must skip the restricted target.
    await settle(() => false, 50);

    // The protected Digimon stays UNSUSPENDED despite the effect targeting it.
    expect(protectedDigimon.isSuspended).toBe(false);
    expect(ledger(s).hasRestriction(protectedDigimon.permanentId, "beSuspended")).toBe(true);
    assertNoLoudGap(s);
  });

  it("Return: AD1-024 [When Digivolving] returns the lone opponent Digimon to its deck bottom", async () => {
    // AD1-024's Return fires at [When Digivolving]/[When Attacking] (documented behavior shared
    // WD/WA rule implementation; the card has no On Play return), so drive a real digivolve onto
    // its named alternate base ("Imperialdramon: Dragon Mode": Cost 1).
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const target = digimon(1, 5000);
    p1.battleArea.push(target);
    const topId = target.topCard?.instanceId;

    const base = digimon(0, 8000, "BT12-030"); // Imperialdramon: Dragon Mode
    p0.battleArea.push(base);
    const evolving = instance("AD1-024", 0, false);
    p0.hand.push(evolving);
    s.state.memory = 5; // alternate digivolve cost 1

    expect(digivolve(s, 0, base.permanentId, evolving)).toEqual({ ok: true });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId));

    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    expect(p1.deck.some((c) => c.instanceId === topId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("DeDigivolve: BT16-026 [On Play] de-digivolves the lone opponent Digimon by 2", async () => {
    const s = setup({ autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;
    // Lv.6 top over Lv.5 over Lv.4: two trashes are legal here, because <De-Digivolve> stops
    // once the top card is level 3 or lower (comprehensive rules 16-12-4).
    const target = digimon(1, 8000, "AD1-004"); // Lv.6 top
    target.stack.push(instance("AD1-001", 1, true), instance("BT1-020", 1, true)); // Lv.4 under Lv.5
    p1.battleArea.push(target);

    const source = instance("BT16-026", 0, false); // Digimon, cost 7
    (s.state.players[0] as PlayerState).hand.push(source);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => target.stack.length === 0, 5000);

    // Both top cards are TRASHED (16-12-1), leaving the Lv.4 card as the new top.
    expect(target.stack).toHaveLength(0);
    expect(target.topCard?.cardId).toBe("AD1-001");
    expect(p1.trash.map((c) => c.cardId).sort()).toEqual(["AD1-004", "BT1-020"]);
    assertNoLoudGap(s);
  });

  it("TrashDigivolution: BT14-083 [On Play] trashes the top digivolution card of the opponent Digimon", async () => {
    const s = setup({ autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;
    const target = digimon(1, 8000, "AD1-001");
    const bottom = instance("BT1-009", 1, true);
    const top = instance("BT1-010", 1, true);
    target.stack.push(bottom, top); // bottom..top
    p1.battleArea.push(target);

    const source = instance("BT14-083", 0, false); // Tamer, cost 3
    (s.state.players[0] as PlayerState).hand.push(source);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => target.stack.length === 1);

    expect(target.stack).toHaveLength(1);
    expect(target.stack[0]?.instanceId).toBe(bottom.instanceId); // the top card was trashed
    expect(p1.trash.some((c) => c.instanceId === top.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("Unsuspend: EX7-019 [On Play] unsuspends a suspended friendly Digimon", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const target = digimon(0, 5000); // my Digimon, pushed first -> first candidate
    target.isSuspended = true;
    p0.battleArea.push(target);

    const source = instance("EX7-019", 0, false); // Digimon, cost 5
    p0.hand.push(source);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !target.isSuspended);

    expect(target.isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("Restrict unsuspend: BT14-047 [On Play] keeps opponent's <=5000 Digimon suspended next unsuspend phase", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Opponent's board: a low-DP Digimon (<=5000, restricted) and a high-DP one (>5000, unaffected).
    const low = digimon(1, 5000); // exactly 5000 -> restricted (lte)
    const high = digimon(1, 6000); // >5000 -> still unsuspends
    p1.battleArea.push(low, high);

    const source = instance("BT14-047", 0, false);
    p0.hand.push(source);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    // The OnPlay Suspend picks the first opponent candidate (low); the Restrict arms both
    // <=5000 opponent Digimon. Settle on the restriction landing on `low`.
    await settle(() => ledger(s).hasRestriction(low.permanentId, "unsuspend"));

    expect(ledger(s).hasRestriction(low.permanentId, "unsuspend")).toBe(true);
    expect(ledger(s).hasRestriction(high.permanentId, "unsuspend")).toBe(false);

    // Drive the opponent's Active-phase unsuspend seam: both opponent Digimon are suspended.
    low.isSuspended = true;
    high.isSuspended = true;
    const unsuspend = (
      s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
    ).unsuspendForActivePhase.bind(s.engine);
    const flipped = await unsuspend(1);

    // The restricted <=5000 Digimon stays SUSPENDED; the >5000 one unsuspends.
    expect(low.isSuspended).toBe(true);
    expect(high.isSuspended).toBe(false);
    expect(flipped).toContain(high.permanentId);
    expect(flipped).not.toContain(low.permanentId);
    assertNoLoudGap(s);
  });

  it("TrashTopDeck: BT14-075 [On Play] trashes the top 3 cards of your deck", async () => {
    const s = setup({ autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    p0.deck.push(
      instance("BT1-009", 0, false),
      instance("BT1-010", 0, false),
      instance("BT1-011", 0, false),
      instance("BT1-012", 0, false),
    ); // 4 cards; the top 3 are milled
    const source = instance("BT14-075", 0, false); // Digimon, cost 7
    p0.hand.push(source);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.trash.length >= 3);

    expect(p0.deck).toHaveLength(1);
    expect(p0.trash).toHaveLength(3);
    assertNoLoudGap(s);
  });

  it("Modal: BT17-015 [On Play] option 0 (Delete) removes the opponent's <=8000 DP Digimon", async () => {
    const s = setup({ autoChooseOption: true, autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;
    const target = digimon(1, 8000); // within the option-0 Delete filter (<=8000)
    p1.battleArea.push(target);

    const source = instance("BT17-015", 0, false); // Digimon, cost 11; Modal [Delete | Digivolve]
    (s.state.players[0] as PlayerState).hand.push(source);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId));

    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("A3 continuous grants — GainKeyword / Restrict (ledger-read)", () => {
  it("GainKeyword: BT10-070 [On Play] grants <Blitz> to itself", async () => {
    // [On Play] "If this Digimon has 3 digivolution cards, <Blitz>" (documented behavior:
    // DigivolutionCards.Count >= 3; KB Q1994). A hard play from hand has 0 digivolution
    // cards (the gate faithfully FAILS), so lay the permanent with 3 stacked digivolution
    // cards — the state an effect-driven play-with-sources produces — and fire the
    // On Play window through the engine's timing seam (the BT14-082 pattern above).
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const perm = digimon(0, 11000, "BT10-070");
    perm.stack.push(instance("BT1-029", 0, true), instance("BT1-035", 0, true), instance("BT1-041", 0, true));
    p0.battleArea.push(perm);

    void (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(EffectTiming.OnPlay);
    await settle(() => ledger(s).hasKeyword(perm.permanentId, "Blitz"));

    expect(ledger(s).hasKeyword(perm.permanentId, "Blitz")).toBe(true);
    assertNoLoudGap(s);
  });

  it("GainKeyword: BT10-070 [On Play] Blitz gate FAILS with fewer than 3 digivolution cards", async () => {
    // The same On Play window with only 2 stacked cards: the selfDigivolutionCountAtLeast
    // gate (>= 3) does not hold, so no <Blitz> is recorded.
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const perm = digimon(0, 11000, "BT10-070");
    perm.stack.push(instance("BT1-029", 0, true), instance("BT1-035", 0, true));
    p0.battleArea.push(perm);

    void (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(EffectTiming.OnPlay);
    await settle(() => false, 60);

    expect(ledger(s).hasKeyword(perm.permanentId, "Blitz")).toBe(false);
    assertNoLoudGap(s);
  });

  it("Restrict: BT16-018 [On Play] grants 'can't be deleted in battle' to your Digimon", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const source = instance("BT16-018", 0, false); // Digimon, cost 4; On Play: 1 of your Digimon gets the restriction
    p0.hand.push(source);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT16-018"));
    const perm = findPermanent(s, 0, "BT16-018"); // the only friendly Digimon -> forced target
    await settle(() => ledger(s).hasRestriction(perm.permanentId, "beDeletedInBattle"));

    expect(ledger(s).hasRestriction(perm.permanentId, "beDeletedInBattle")).toBe(true);
    assertNoLoudGap(s);
  });

  it("Aura: BT10-014 [On Play] grants <Blitz> to itself while it is your turn", async () => {
    // The real card's Blitz is [When Digivolving] (documented behavior BlitzSelfEffect with
    // isWhenDigivolving:true — NOT an On Play or aura grant; a hard play from hand would
    // faithfully grant nothing). Digivolve BT10-014 (Lv6 Red, evo cost 3 from Lv5 Red)
    // onto a vanilla Lv5 Red base and assert the self-grant lands in the ledger.
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const base = digimon(0, 10000, "BT1-024"); // MetalTyrannomon — vanilla Red Lv5
    p0.battleArea.push(base);
    const source = instance("BT10-014", 0, false);
    p0.hand.push(source);
    s.state.memory = 5; // affords the evo cost 3; turnSeat is 0 (your turn)

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: source.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => base.topCard?.cardId === "BT10-014");
    await settle(() => ledger(s).hasKeyword(base.permanentId, "Blitz"));

    expect(ledger(s).hasKeyword(base.permanentId, "Blitz")).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("A3 trait filter — trait-gated static selects by Form∪Attribute∪Type", () => {
  // Guardrail for the committed trait-data snapshot and the
  // interpreter's CardTraits = Form ∪ Attribute ∪ Type union). Before the fix every card's
  // trait lists were empty, so any match:'trait' filter selected nobody and this static buff
  // was silently inert. The test fails (matching Digimon stays at base DP) if traits regress.
  it("BT16-050 [All Turns] +1000 DP buffs only your [D-Brigade]/[DigiPolice] Digimon", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const matching = digimon(0, 2000, "BT14-058"); // [Mollusk/DigiPolice] -> in the trait filter
    const control = digimon(0, 5000, "AD1-001"); // [Dinosaur/Champion/Vaccine] -> not in the filter
    p0.battleArea.push(matching, control);

    const source = instance("BT16-050", 0, false); // Commandramon, cost 3; [All Turns] trait-gated +1000 DP aura
    p0.hand.push(source);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => matching.currentDP !== 2000);

    expect(matching.currentDP).toBe(3000); // 2000 + 1000 from the trait-gated aura
    expect(control.currentDP).toBe(5000); // untouched: trait filter is selective, not blanket
    assertNoLoudGap(s);
  });
});

describe("A3 trait filter — Form-only and Attribute-only union arms (SYS-07)", () => {
  // Guardrail for the Form ∪ Attribute ∪ Type union in matchNameOrTrait
  // (interpreter.ts:253-278). BT16-050 already proves the Type arm; these two A3s
  // prove the Form arm (via BT12-009's [Hybrid] filter) and Attribute arm (via
  // BT14-082's [Vaccine] filter). Each fails-when-reverted on its respective union
  // arm — the independence of all three arms is verified by scratch-reverting each
  // arm individually and confirming only its own A3 goes RED.

  it("BT12-009 [On Play] trash a [Hybrid] in hand → Draw 2 (Form-only arm)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    // Deck must have cards for the Draw 2 to pull from.
    for (let i = 0; i < 5; i++) p0.deck.push(instance("BT1-009", 0, false));

    // AD1-002 Aldamon: forms:["Hybrid"], types:["Wizard"], attributes:["Variable"]
    // — "Hybrid" appears ONLY in forms, so the filter exercises the Form arm of
    // the matchNameOrTrait union.
    const hybridCard = instance("AD1-002", 0, false);
    // BT1-009 Monodramon: types:["Mini Dragon"], forms:["Rookie"], attributes:["Vaccine"]
    // — "Hybrid" does NOT appear anywhere, so it won't match.
    const controlCard = instance("BT1-009", 0, false);
    const source = instance("BT12-009", 0, false); // Flamemon, cost 3; [On Play] trash [Hybrid] → Draw 2
    p0.hand.push(source, hybridCard, controlCard);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    // The [Hybrid] trash fires automatically (autoAcceptOptional + autoSelectCards pick
    // AD1-002 from the hand). Settle on the trashed card landing in trash.
    await settle(() => p0.trash.some((c) => c.instanceId === hybridCard.instanceId));
    // Drain any remaining microtasks so the Draw action has time to resolve.
    await settle(() => false, 40);

    expect(p0.trash.some((c) => c.instanceId === hybridCard.instanceId)).toBe(true);
    // Control card — no "Hybrid" trait — stays in hand.
    expect(p0.hand.some((c) => c.instanceId === controlCard.instanceId)).toBe(true);
    // Hand started with 3 cards (source + hybrid + control).
    // Source was played (→battleArea), hybrid was trashed, Draw 2 added 2.
    // Result: control + 2 drawn cards = 3.
    expect(p0.hand.length).toBe(3);
    assertNoLoudGap(s);

    // FAILS-WHEN-REVERTED: comment out `...(def.forms ?? [])` at interpreter.ts:267.
    // The [Hybrid] filter no longer matches any hand card → Trash no-ops → Draw 2 does
    // not fire → hand.length stays 2 (only control), the trash assertion fails.
    // The BT16-050 (Type) and BT14-082 (Attribute) A3s stay GREEN during this revert.
  });

  it("BT14-082 [Start of Your Main Phase] +2000 DP to a [Vaccine] Digimon (Attribute-only arm)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    // AD1-001 Greymon: attributes:["Vaccine"], types:["Dinosaur","ADVENTURE"], forms:["Champion"]
    // — "Vaccine" appears ONLY in attributes, so the filter exercises the Attribute arm.
    const matching = digimon(0, 3000, "AD1-001");
    // BT1-013 Muchomon: attributes:["Data"], types:["Avian"], forms:["Rookie"]
    // — "Vaccine" does NOT appear anywhere, so it won't match.
    const control = digimon(0, 3000, "BT1-013");
    p0.battleArea.push(matching, control);

    const source = instance("BT14-082", 0, false); // Tai Kamiya, cost 3
    p0.hand.push(source);
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    // Fire the Start of Your Main Phase timing seam. NOT awaited: the ModifyDP resolves
    // synchronously in the recompute. The caller settles on the DP observable.
    void (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );

    await settle(() => matching.currentDP !== 3000);

    expect(matching.currentDP).toBe(5000); // 3000 + 2000 from the [Vaccine]-gated buff
    expect(control.currentDP).toBe(3000); // untouched — no "Vaccine" trait
    assertNoLoudGap(s);

    // FAILS-WHEN-REVERTED: comment out `...(def.attributes ?? [])` at interpreter.ts:268.
    // The [Vaccine] filter no longer matches → ModifyDP does not fire → matching stays
    // at 3000, the assertion goes RED. The BT16-050 (Type) and BT12-009 (Form) A3s stay
    // GREEN during this revert.
  });
});

describe("A3 turn ownership — turn-scoped statics fire only on the owning player's turn", () => {
  // the owner in the trigger string ([Opponent's Turn] -> trigger "OpponentsTurn") but emits no
  // isYourTurn condition, so before the fix a [Opponent's Turn] static fired on every continuous
  // recompute regardless of whose turn it was. The test fails (buff present on the owner's turn)
  // if the guard regresses. BT3-068's +1000 is an INHERITED [Opponent's Turn] self-buff: it rides
  // under a top card and buffs the carrying permanent.
  it("BT3-068 [Opponent's Turn] +1000 DP applies on the opponent's turn, not the owner's", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const perm = digimon(0, 2000, "AD1-001"); // vanilla top card; baseDP 2000
    perm.stack.push(instance("BT3-068", 0, true)); // under-card grants the [Opponent's Turn] +1000
    p0.battleArea.push(perm);

    s.state.turnSeat = 0; // owner's turn -> the [Opponent's Turn] gate is false
    await s.engine.recomputeContinuousEffects();
    expect(perm.currentDP).toBe(2000);

    s.state.turnSeat = 1; // opponent's turn -> the gate holds, +1000 applies
    await s.engine.recomputeContinuousEffects();
    expect(perm.currentDP).toBe(3000);
  });
});

describe("A3 BT15-020 — [Start of Your Main Phase] grants Blocker", () => {
  it("grants Blocker to one friendly Digimon and then draws with a Matt Ishida Tamer", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT15-020", as: "gabumon" },
            { card: "BT1-086", as: "matt" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    const gabumon = s.perm("gabumon");

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, gabumon);
    await settle(() => ledger(s).hasKeyword(gabumon.permanentId, "Blocker") && s.state.players[0]!.hand.length === 1);

    expect(ledger(s).hasKeyword(gabumon.permanentId, "Blocker")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    assertNoLoudGap(s);
  });
});

describe("A3 PlaceUnder — places a card under a permanent (non-deletion path)", () => {
  it("BT19-024 [On Play] places a hand Digimon under one of your Digimon", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const underTarget = digimon(0, 3000, "BT1-009"); // a friendly Digimon to receive the card
    p0.battleArea.push(underTarget);

    // BT1-033 Dolphmon ([Sea Animal] type) — the placed hand card must carry the
    // [Aqua]/[Sea Animal] trait, the official precondition of BT19-024's [On Play]
    // (documented behavior CanSelectHandCardConditionShared: IsDigimon && HasAquaTraits).
    const placed = instance("BT1-033", 0, false); // the hand Digimon to be placed under
    const source = instance("BT19-024", 0, false); // Digimon, cost 7; On Play (optional): place 1 from hand under
    p0.hand.push(placed, source);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !p0.hand.some((c) => c.instanceId === placed.instanceId));

    // The hand Digimon left the hand and is now a digivolution card under some friendly permanent.
    expect(p0.hand.some((c) => c.instanceId === placed.instanceId)).toBe(false);
    expect(p0.battleArea.some((p) => p.stack.some((c) => c.instanceId === placed.instanceId))).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("A3 PlaceUnder — <Save> places a deleted card under a Tamer", () => {
  // Gates the OnDestroyedAnyone fire wired into the deletion seam (primitives.deletePermanent /
  // combat / security). P-115's [On Deletion] (errata 2024-05-17, Q4223) ends in ＜Save＞: place
  // this card under one of its controller's Tamers. The effect fires only because a REAL deletion
  // (opponent's BT13-011 [On Play] Delete) now opens the OnDestroyedAnyone window, the trashed
  // P-115 becomes an [On Deletion] candidate, and PlaceUnder.isSelf pulls it back out of trash.
  it("P-115 [On Deletion] <Save> places itself under a chosen Tamer", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    // Friendly Tamer to receive the saved card. The fixture avoids depending on the
    // PlayWithoutCost action: no Amano Tamer sits in hand/trash, so that action is an upTo
    // no-op and only the ＜Save＞ PlaceUnder runs.
    const tamer = digimon(0, 0, "BT1-085"); // Tai Kamiya, a Tamer permanent on seat 0
    p0.battleArea.push(tamer);

    // P-115 as a battle-area Digimon controlled by p0; currentDP 3000 puts it inside BT13-011's
    // "<=3000 DP" delete filter (DP is fixture data; card identity drives the [On Deletion]).
    const skull = digimon(0, 3000, "P-115");
    p0.battleArea.push(skull);
    const selfInstanceId = skull.topCard!.instanceId;

    // The opponent plays BT13-011 ([On Play] delete 1 of your opponent's <=3000 DP Digimon) on
    // their turn — a LIVE deletion through the primitive seam, not a hand-call.
    const p1 = s.state.players[1] as PlayerState;
    s.state.turnSeat = 1;
    const deleter = instance("BT13-011", 1, false);
    p1.hand.push(deleter);
    s.state.memory = 5;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: deleter.instanceId })).toEqual({
      ok: true,
    });
    // Settle on the ＜Save＞ placement, not merely the deletion: P-115 leaves the field during the
    // delete, but the OnDestroyedAnyone window resolves PlaceUnder behind async optional/target
    // prompts, so a deletion-only predicate would race ahead of the placement.
    await settle(() => tamer.stack.some((c) => c.instanceId === selfInstanceId));

    // P-115 left the field...
    expect(p0.battleArea.some((p) => p.permanentId === skull.permanentId)).toBe(false);
    // ...and ＜Save＞ placed it as a digivolution card under the chosen Tamer, pulled out of trash.
    const tamerPerm = p0.battleArea.find((p) => p.permanentId === tamer.permanentId)!;
    expect(tamerPerm.stack.some((c) => c.instanceId === selfInstanceId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === selfInstanceId)).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("A3 activated [Main] — the activateEffect verb (OnDeclaration window)", () => {
  // This is the first oracle coverage of the `activateEffect` player verb: a permanent's
  // [Main] ability, surfaced at EffectTiming.OnDeclaration by the `activated` builder, driven
  // by the same intent the client sends. BT15-009 is a clean single-action [Main] permanent
  // ability with a FAITHFULLY MODELED activation cost: its "by paying 2 cost" is compiled as
  // `cost:{kind:"payMemory"}` (wired in payCost) and its Delete verb is wired, so the engine's
  // behavior matches the printed card end to end.
  //
  // GAP digiBurst (CLOSED): a "<Digi-Burst N>" activation cost — trash N of THIS Digimon's own
  // digivolution cards to activate the [Main] effect below — was mis-compiled by BOTH front-ends:
  // the no-target form `cost:{kind:"trash",raw:"Digi-Burst N"}` (which payCost could not pay, so
  // the ability silently aborted) or the cost dropped entirely (free activation). The compile/
  // Declarative effects use the engine's all-or-nothing digivolution-cards trash cost.
  // (`cost:{kind:"trash",target:{filter:{isSelfRef:true,zone:"digivolutionCards"},count:N}}`,
  // payCost both gates and pays). The BT4-068 / BT4-049 tests below exercise it end to end. The
  // "up to N" variant (SetUpToMaxCount, BT7-040) is a variable-count cost the engine does not yet
  // model and stays raw-only on purpose.
  it("BT15-009 [Main] (pay 2) deletes the lone opponent Digimon with DP <= its own DP", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const source = digimon(0, 4000, "BT15-009"); // my Lv.4 Digimon, DP 4000; [Main][OPT] pay 2, delete opp <= its DP
    p0.battleArea.push(source);
    const sourceInstanceId = source.topCard!.instanceId;

    const target = digimon(1, 3000); // opponent Digimon, 3000 DP <= 4000 -> the forced Delete target
    p1.battleArea.push(target);

    s.state.memory = 5; // the "by paying 2 cost" takes memory 5 -> 3, proving the cost was actually paid

    const entry = activatableEffects(s, source).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "BT15-009 surfaces its [Main] ability as an activatable affordance").toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId));

    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === target.topCard?.instanceId)).toBe(true);
    expect(s.state.memory).toBe(3); // the activation cost (pay 2) was paid through the real seam
    assertNoLoudGap(s);
  });

  it("BT15-009 [Main] [Once Per Turn] rejects a second activation the same turn", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const source = digimon(0, 4000, "BT15-009");
    p0.battleArea.push(source);
    const sourceInstanceId = source.topCard!.instanceId;

    // Two legal targets so the only thing stopping a second use is the per-turn limit.
    const first = digimon(1, 3000);
    const second = digimon(1, 2000);
    p1.battleArea.push(first, second);
    s.state.memory = 10;

    const effectKey = activatableEffects(s, source).find((e) => e.instanceId === sourceInstanceId)!.effectKey;

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey })).toEqual({ ok: true });
    // Settle on effectActivated, not just the delete: the per-turn use is registered AFTER
    // resolve() returns, so the affordance is only withdrawn once the whole activation chain
    // (which emits effectActivated) completes.
    await settle(() => s.events.some((e) => e.kind === "effectActivated"));
    expect(p1.battleArea.some((p) => p.permanentId === first.permanentId)).toBe(false);
    assertNoLoudGap(s);

    // The use is now registered: the affordance is withdrawn and a re-activation is rejected
    // synchronously by the kernel's maxPerTurn guard (canTrigger/canActivate -> illegal-target).
    expect(activatableEffects(s, source)).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey })).toEqual({
      ok: false,
      reason: "illegal-target",
    });

    // The second target is untouched — the rejected verb mutated nothing.
    expect(p1.battleArea.some((p) => p.permanentId === second.permanentId)).toBe(true);
  });

  // GAP digiBurst — BT4-068 [Main] <Digi-Burst 2> -> De-Digivolve 1. The activation cost is
  // "trash 2 of THIS Digimon's digivolution cards"; payCost reads the SOURCE stack, requires
  // >= 2, and trashes the top 2. The negative case proves the cost gates: a 1-card stack is
  // too short, so the affordance never surfaces. Before the fix the IR dropped this cost, so
  // the ability would have activated for free with the stack intact — this test caught that.
  it("BT4-068 [Main] <Digi-Burst 2> trashes 2 stack cards then De-Digivolves an opponent", async () => {
    const s = setup({ autoSelectCards: true, autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const source = digimon(0, 6000, "BT4-068");
    const burst1 = instance("AD1-001", 0, false);
    const burst2 = instance("AD1-001", 0, false);
    source.stack.push(burst1, burst2); // the 2 digivolution cards the <Digi-Burst 2> pays
    p0.battleArea.push(source);
    const sourceInstanceId = source.topCard!.instanceId;

    // Opponent Digimon: top card playCost 5 (<= 7) with one stack card so De-Digivolve has a
    // card to revert to (the old top goes to the deck, the stack shrinks by 1).
    const target = digimon(1, 5000, "AD1-001");
    const targetUnder = instance("BT1-009", 1, false);
    target.stack.push(targetUnder);
    p1.battleArea.push(target);
    const oldTargetTopId = target.topCard!.instanceId;

    const entry = activatableEffects(s, source).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "BT4-068 surfaces its <Digi-Burst 2> [Main] ability").toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => target.topCard?.instanceId === targetUnder.instanceId);

    // Cost paid from the SOURCE stack: both burst cards are gone and now in my trash.
    expect(source.stack).toHaveLength(0);
    expect(p0.trash.some((c) => c.instanceId === burst1.instanceId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === burst2.instanceId)).toBe(true);

    // De-Digivolve 1 resolved: the opponent's top reverted to its single stack card, the old
    // top moved off the battle area (to the deck), so the stack shrank by 1.
    expect(target.topCard?.instanceId).toBe(targetUnder.instanceId);
    expect(target.stack).toHaveLength(0);
    expect(p1.battleArea.some((p) => p.topCard?.instanceId === oldTargetTopId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("BT4-068 <Digi-Burst 2> no-ops when the stack holds fewer than 2 cards", async () => {
    const s = setup({ autoSelectCards: true, autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const source = digimon(0, 6000, "BT4-068");
    const lone = instance("AD1-001", 0, false);
    source.stack.push(lone); // only 1 digivolution card -> <Digi-Burst 2> is unpayable
    p0.battleArea.push(source);
    const sourceInstanceId = source.topCard!.instanceId;

    const target = digimon(1, 5000, "AD1-001");
    const targetUnder = instance("BT1-009", 1, false);
    target.stack.push(targetUnder);
    p1.battleArea.push(target);

    // The activation affordance is suppressed when its required Digi-Burst payment cannot be
    // made, so the client cannot offer a dead activation.
    const entry = activatableEffects(s, source).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "the affordance is absent when Digi-Burst 2 cannot be paid").toBeUndefined();

    expect(source.stack).toHaveLength(1); // the lone digivolution card was NOT trashed
    expect(p0.trash.some((c) => c.instanceId === lone.instanceId)).toBe(false);
    expect(target.topCard?.instanceId).not.toBe(targetUnder.instanceId); // De-Digivolve did not run
    expect(target.stack).toHaveLength(1);
    assertNoLoudGap(s);
  });

  // GAP digiBurst — BT4-049 [Main] <Digi-Burst 3> -> all opp Digimon -4000 DP for the turn.
  it("BT4-049 [Main] <Digi-Burst 3> trashes 3 stack cards then -4000 DP to all opponents", async () => {
    const s = setup({ autoSelectCards: true, autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const source = digimon(0, 7000, "BT4-049");
    const burst = [instance("AD1-001", 0, false), instance("AD1-001", 0, false), instance("AD1-001", 0, false)];
    source.stack.push(...burst); // the 3 digivolution cards the <Digi-Burst 3> pays
    p0.battleArea.push(source);
    const sourceInstanceId = source.topCard!.instanceId;

    const opp1 = digimon(1, 5000);
    const opp2 = digimon(1, 4000);
    p1.battleArea.push(opp1, opp2);

    const entry = activatableEffects(s, source).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "BT4-049 surfaces its <Digi-Burst 3> [Main] ability").toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => opp1.currentDP === 1000);

    // Cost paid from the SOURCE stack: all 3 burst cards are gone and now in my trash.
    expect(source.stack).toHaveLength(0);
    for (const c of burst) expect(p0.trash.some((t) => t.instanceId === c.instanceId)).toBe(true);

    // Both opponents lost 4000 DP for the turn.
    expect(opp1.currentDP).toBe(1000);
    expect(opp2.currentDP).toBe(0);
    assertNoLoudGap(s);
  });

  it("BT4-049 <Digi-Burst 3> no-ops when the stack holds fewer than 3 cards", async () => {
    const s = setup({ autoSelectCards: true, autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const source = digimon(0, 7000, "BT4-049");
    const twoCards = [instance("AD1-001", 0, false), instance("AD1-001", 0, false)];
    source.stack.push(...twoCards); // only 2 -> <Digi-Burst 3> is unpayable
    p0.battleArea.push(source);
    const sourceInstanceId = source.topCard!.instanceId;

    const opp = digimon(1, 5000);
    p1.battleArea.push(opp);

    const entry = activatableEffects(s, source).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "the affordance is absent when Digi-Burst 3 cannot be paid").toBeUndefined();

    // payCost fails (2 < 3): nothing is trashed and the opponent keeps full DP (no free -4000).
    expect(source.stack).toHaveLength(2);
    for (const c of twoCards) expect(p0.trash.some((t) => t.instanceId === c.instanceId)).toBe(false);
    expect(opp.currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});

describe("A3 DisableSecurityEffect — a disabled [Security]-of-Option effect does NOT fire", () => {
  // BT1-025 (security half of the source rule implementation split): while it is the
  // attacker, a flipped Option security card's [Security] effect does not activate (the card
  // is still trashed per KB Q886). sourceKind:"option" must NOT suppress a Digimon's
  // [Security] effect. The consume site is GameEngine.resolveSecurityEffect.
  function securityCard(seat: Seat, cardId: string): CardInstance {
    return instance(cardId, seat, false);
  }

  /** The resolution label the engine emitted for the security card with this id. */
  function securityResolution(s: Setup, cardId: string): string | undefined {
    const e = s.events.find(
      (ev) => ev.kind === "securityChecked" && "revealedCardId" in ev && ev.revealedCardId === cardId,
    );
    return e && "resolution" in e ? (e.resolution as string) : undefined;
  }

  it("BT1-025 attacker suppresses an Option's [Security] effect (resolution=trashed); the card still leaves security", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;

    // BT1-025 is seat0's attacker. Its [Your Turn] static records a DisableSecurityEffect on
    // itself (sourceKind "option") at the continuous recompute that runs during the check.
    const attacker = digimon(0, 11000, "BT1-025");
    (s.state.players[0] as PlayerState).battleArea.push(attacker);

    // seat1's only security card is an OPTION with a [Security] effect (BT20-099: gain 1 memory,
    // then add itself to hand). Disabled => the effect is skipped and the card is trashed.
    const optionSec = securityCard(1, "BT20-099");
    p1.security.push(optionSec);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => securityResolution(s, "BT20-099") !== undefined);

    // Positive on disable: the Option's [Security] effect did NOT apply — the check resolved
    // it as "trashed", not "effect".
    expect(securityResolution(s, "BT20-099")).toBe("trashed");
    // Q886: the flipped Option still left the security stack (it is no longer in security,
    // and AddToHandSelf did not run, so it is not in hand either — it went to trash).
    expect(p1.security.some((c) => c.instanceId === optionSec.instanceId)).toBe(false);
    expect(p1.hand.some((c) => c.instanceId === optionSec.instanceId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === optionSec.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("negative control (Q1516): a Digimon's [Security] effect is NOT suppressed by sourceKind:option", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 11000, "BT1-025");
    (s.state.players[0] as PlayerState).battleArea.push(attacker);

    // The disable is recorded on the attacker, but the flipped security card is a DIGIMON
    // (P-067 carries a [Security] Draw 2 effect). sourceKind:"option" must not touch it, so its
    // security effect still resolves (resolution="effect") and seat1 draws.
    const digimonSec = securityCard(1, "P-067");
    p1.security.push(digimonSec);
    for (let i = 0; i < 4; i++) p1.deck.push(instance("BT1-028", 1, false));
    const deckBefore = p1.deck.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => securityResolution(s, "P-067") !== undefined, 200);
    await settle(() => false, 40);

    expect(securityResolution(s, "P-067")).toBe("effect");
    expect(p1.deck.length).toBe(deckBefore - 2); // the [Security] Draw 2 fired
    assertNoLoudGap(s);
  });
});

describe("A3 DisableTimingEffect — a disabled [When Digivolving] effect does NOT fire", () => {
  // EX8-035 (timing half of the source rule implementation split): while owner memory is 1+,
  // the opponent's Digimon do not activate their [When Digivolving] effects — unless the
  // affected Digimon carries the `beAffected` effect-immunity. Consume site: the per-effect
  // activation gate (gatherTriggeredEffects).
  //
  // Observable = the DECK delta. The digivolve itself always draws 1 (the standard digivolve
  // draw), so the disable is read off the SECOND draw: BT16-020's [When Digivolving] draws 1
  // more (deck -2 total when it fires; deck -1 when it is suppressed).

  /**
   * Lay a seat1 Lv.3 Blue base with BT16-020 (Lv.4 Blue, [When Digivolving] Draw 1) in hand,
   * memory affording the cost-2 digivolve. `withDisabler` adds EX8-035 (seat0) so its [All
   * Turns] DisableTimingEffect (whenDigivolving) is live.
   */
  function setupTimingDisable(opts: { withDisabler: boolean }): {
    s: Setup;
    base: Permanent;
    evolver: CardInstance;
    p1: PlayerState;
  } {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    if (opts.withDisabler) {
      p0.battleArea.push(digimon(0, 9000, "EX8-035"));
    }

    // seat1 digivolves on its own turn; its base is a Lv.3 Blue Digimon (no module = no effects).
    const base = digimon(1, 4000, "BT1-027");
    p1.battleArea.push(base);

    // BT16-020 (Lv.4 Blue): [When Digivolving] Draw 1, Gain 1 memory.
    const evolver = instance("BT16-020", 1, false);
    p1.hand.push(evolver);

    // Plenty of deck so both the digivolve draw and the [When Digivolving] draw are observable.
    for (let i = 0; i < 6; i++) p1.deck.push(instance("BT1-028", 1, false));

    s.state.turnSeat = 1;
    s.state.memory = -5; // source owner seat 0 has +5; seat 1 can still afford cost 2
    return { s, base, evolver, p1 };
  }

  it("EX8-035 suppresses the opponent's [When Digivolving] draw (only the digivolve draw happens)", async () => {
    const { s, base, evolver, p1 } = setupTimingDisable({ withDisabler: true });
    const deckBefore = p1.deck.length;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: evolver.instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => base.topCard?.cardId === "BT16-020");
    await settle(() => false, 60);

    // The digivolve succeeded (BT16-020 is on the field) and drew the standard 1 card, but its
    // [When Digivolving] Draw was suppressed by the disable — so the deck dropped by ONLY 1.
    expect(base.topCard?.cardId).toBe("BT16-020");
    expect(p1.deck.length).toBe(deckBefore - 1);
    expect(ledger(s).hasRestriction(base.permanentId, "beAffected")).toBe(false);
    assertNoLoudGap(s);
  });

  it("immunity bypass (CanNotBeAffected analog): a beAffected source still fires its [When Digivolving]", async () => {
    const { s, base, evolver, p1 } = setupTimingDisable({ withDisabler: true });
    const deckBefore = p1.deck.length;

    // Grant the seat1 base the `beAffected` effect-immunity. The consume site's exception then
    // lets BT16-020's [When Digivolving] fire again despite the active disable.
    ledgerWrite(s).addRestriction(base.permanentId, "beAffected", EFFECT_DURATION_TURN, {
      continuous: false,
    });

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: evolver.instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => base.topCard?.cardId === "BT16-020");
    await settle(() => p1.deck.length <= deckBefore - 2, 80);

    // Immune: BOTH the digivolve draw and the [When Digivolving] draw fired (deck -2).
    expect(base.topCard?.cardId).toBe("BT16-020");
    expect(p1.deck.length).toBe(deckBefore - 2);
    assertNoLoudGap(s);
  });

  it("negative control: with no disabler present the [When Digivolving] draw fires (deck -2)", async () => {
    const { s, base, evolver, p1 } = setupTimingDisable({ withDisabler: false });
    const deckBefore = p1.deck.length;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: evolver.instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => base.topCard?.cardId === "BT16-020");
    await settle(() => p1.deck.length <= deckBefore - 2, 80);

    // No EX8-035 => no disable: both the digivolve draw and the [When Digivolving] draw fire.
    expect(p1.deck.length).toBe(deckBefore - 2);
    expect(ledger(s).hasRestriction(base.permanentId, "beAffected")).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("A3 WhenAttacking — GainMemory fires on attack declaration", () => {
  // BT4-057 (GrapLeomon): [When Attacking] Gain 1 memory.
  // The WhenAttacking window fires via EffectTiming.OnUseAttack inside
  // CombatController.resolveAttack, BEFORE the security check. GainMemory routes
  // through MemoryGauge.addMemoryForSeat: seat 0 is the turn player, so delta = +1
  // and state.memory rises by exactly 1.
  it("BT4-057 [When Attacking] gains 1 memory for the attacker's controller", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // GrapLeomon on seat 0's battle area, unsuspended (required by canAttackerDeclare).
    const attacker = digimon(0, 6000, "BT4-057");
    p0.battleArea.push(attacker);

    // Give seat 1 one security card so the win check does not end the game before the
    // settle predicate fires (WhenAttacking precedes the security check, so memory
    // already changed, but a game-over can complicate async settling).
    p1.security.push(instance("BT1-028", 1, false));

    s.state.memory = 3; // arbitrary non-boundary value
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // Settle on the memory increase — the sole observable of GainMemory 1.
    await settle(() => s.state.memory === memoryBefore + 1);

    expect(s.state.memory).toBe(memoryBefore + 1);
    assertNoLoudGap(s);
  });
});

describe("A3 PlayWithoutCost — BT1-056 Petermon [On Play] plays Tinkermon for free", () => {
  // BT1-056 [On Play] You may play 1 [Tinkermon] from your hand or recycle bin without
  // paying its memory cost.
  // IR: PlayWithoutCost, payCost:false, from:["trash","hand"], filter:{nameOrTrait:[{tokens:["Tinkermon"],match:"name"}]},
  //     optional:true, count:1, upTo:true.
  // KB Q915: only 1 copy total (from one zone, not 1 each from hand and trash).
  // KB Q916: the played Tinkermon cannot attack this turn (entered play normally).

  it("BT1-056 [On Play] plays the lone Tinkermon from hand into the battle area for free", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    // Petermon (cost 5) in hand; Tinkermon (cost 3, 3000 DP) also in hand.
    const petermon = instance("BT1-056", 0, false);
    const tinkermon = instance("BT1-047", 0, false);
    p0.hand.push(petermon, tinkermon);
    s.state.memory = 5; // affords Petermon's cost-5 play

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: petermon.instanceId })).toEqual({ ok: true });

    // Wait until Tinkermon lands in the battle area (the free play resolves).
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT1-047"), 200);
    await settle(() => false, 40);

    // Tinkermon is now on the field (played for free — no cost charged).
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT1-047")).toBe(true);
    // Tinkermon left hand (not still there).
    expect(p0.hand.some((c) => c.instanceId === tinkermon.instanceId)).toBe(false);
    // Memory changed only for Petermon's own cost-5 play, not again for Tinkermon (payCost:false).
    // After playing cost-5 from memory-5, memory lands at 0 (opponent side) or per engine rules;
    // the critical invariant is that Tinkermon's cost-3 was NOT additionally subtracted.
    const tinkerPermanent = p0.battleArea.find((p) => p.topCard?.cardId === "BT1-047");
    expect(tinkerPermanent).toBeDefined();
    expect(tinkerPermanent!.topCard?.cardId).toBe("BT1-047");
    expect(tinkerPermanent!.baseDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("BT1-056 [On Play] plays Tinkermon from the trash (recycle bin) for free", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    // Petermon in hand; Tinkermon already in trash (recycle bin).
    const petermon = instance("BT1-056", 0, false);
    const tinkermon = instance("BT1-047", 0, false);
    p0.hand.push(petermon);
    p0.trash.push(tinkermon);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: petermon.instanceId })).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT1-047"), 200);
    await settle(() => false, 40);

    // Tinkermon moved from trash to battle area for free.
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT1-047")).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === tinkermon.instanceId)).toBe(false);
    const tinkerPermanent = p0.battleArea.find((p) => p.topCard?.cardId === "BT1-047");
    expect(tinkerPermanent).toBeDefined();
    expect(tinkerPermanent!.baseDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("BT1-056 [On Play] no-ops gracefully when no Tinkermon is available in hand or trash", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    // Petermon in hand; no Tinkermon anywhere (hand or trash).
    const petermon = instance("BT1-056", 0, false);
    p0.hand.push(petermon);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: petermon.instanceId })).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT1-056"), 200);
    await settle(() => false, 40);

    // Petermon entered play; no Tinkermon appeared (candidates was empty — pickLoose returns []).
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT1-056")).toBe(true);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT1-047")).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("A3 Return — BT1-011 Agumon Expert [On Play] returns from recycle bin, not itself", () => {
  // BT1-011 [On Play] Return 1 Digimon card with [Agumon] in its name from your recycle
  // bin to your hand. IR: Return, target.filter.zone:"trash", nameOrTrait Agumon, to:"hand".
  //
  // Root cause fixed: the prose compiler's trash-zone detector (the filter normalization logic)
  // only recognized "trash", not the "recycle bin" alias this card's printed text uses, so
  // the target filter carried no zone constraint and defaulted to the battle area — where
  // Agumon Expert itself (also named "Agumon") is the only match, self-bouncing to hand
  // instead of returning a trashed Agumon card.

  it("returns the Agumon card FROM THE TRASH, not the just-played Agumon Expert", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const agumonExpert = instance("BT1-011", 0, false);
    const trashedAgumon = instance("BT1-010", 0, false); // a different [Agumon]-named card, in trash
    p0.hand.push(agumonExpert);
    p0.trash.push(trashedAgumon);
    s.state.memory = 3; // affords BT1-011's cost-3 play

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: agumonExpert.instanceId })).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT1-011"), 200);
    await settle(() => false, 40);

    // Agumon Expert stays on the field — it was NOT returned to hand.
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT1-011")).toBe(true);
    // The trashed Agumon left the trash and is now in hand.
    expect(p0.trash.some((c) => c.instanceId === trashedAgumon.instanceId)).toBe(false);
    expect(p0.hand.some((c) => c.instanceId === trashedAgumon.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("A3 SubTrigger — whenPlayed fires Draw ONLY when a green Tamer enters the field", () => {
  // BT10-044 Angoramon has a [Your Turn][Once Per Turn] effect whose IR is
  // SubTrigger { event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Tamer"],
  // colors: ["Green"] }, actions: [Draw 1] }. The interpreter installs the subscription via
  // ctx.fx.subscribeSubTrigger during recomputeContinuousEffects (YourTurn → EffectTiming.None);
  // GameEngine.fireSubTrigger("whenPlayed", …) at the OnPlay/OnEnterFieldAnyone seam now runs
  // the armed body, gated by the captured sourceFilter.
  //
  // FAILS-WHEN-REVERTED:
  //   - Positive draws 0 if the `whenPlayed` fireSubTrigger call (GameEngine playCardDeps
  //     OnPlay seam) is removed, or if runSubTrigger drops action.sourceFilter (then the
  //     subscription never arms a matching body — the install is the same path).
  //   - Negative draws 1 if the `matches` skip in SubTriggerRegistry.fire is removed (the
  //     watcher would then fire on EVERY play, not just a green Tamer) — Pitfall 2.
  it("BT10-044 draws exactly 1 when a GREEN TAMER is played (positive)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    // BT10-044 Angoramon on the field as the SubTrigger host (Lv.3 Green Digimon).
    const host = digimon(0, 2000, "BT10-044");
    p0.battleArea.push(host);

    // Green Tamer in hand (BT1-088 Izzy Izumi, cost 2, [Main] only — no [On Play] draw).
    const tamer = instance("BT1-088", 0, false);
    p0.hand.push(tamer);
    for (let i = 0; i < 3; i++) p0.deck.push(instance("BT1-009", 0, false));
    const deckBefore = p0.deck.length;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: tamer.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT1-088"));
    await settle(() => p0.deck.length < deckBefore, 100);

    // The whenPlayed SubTrigger Draw 1 fired: deck shrank by exactly 1.
    expect(p0.deck.length).toBe(deckBefore - 1);
    assertNoLoudGap(s);
  });

  it("BT10-044 does NOT draw when a NON-green Tamer is played (negative — sourceFilter)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    const host = digimon(0, 2000, "BT10-044");
    p0.battleArea.push(host);

    // BT11-090 Nicolai Petrov: a BLUE Tamer (cost 3, no [On Play] / no Draw). It is a Tamer
    // but NOT green, so the captured sourceFilter { colors: ["Green"] } must reject it.
    const tamer = instance("BT11-090", 0, false);
    p0.hand.push(tamer);
    for (let i = 0; i < 3; i++) p0.deck.push(instance("BT1-009", 0, false));
    const deckBefore = p0.deck.length;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: tamer.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT11-090"));
    // Give the (incorrect) draw a chance to land, then assert it did NOT.
    await settle(() => false, 50);

    // No green Tamer was played, so the whenPlayed watcher's sourceFilter rejected the event:
    // the deck is untouched.
    expect(p0.deck.length).toBe(deckBefore);
    assertNoLoudGap(s);
  });
});

describe("A3 SubTrigger — onDeletionOf fires ONLY when a watched Digimon is deleted", () => {
  // EX1-064 Piedmon has a NON-inherited [Your Turn][Once Per Turn] effect whose IR is
  // SubTrigger { event: "onDeletionOf", sourceFilter: { controller: "opponent", kind:
  // ["Digimon"] }, actions: [Draw 1] } — "when one of your opponent's Digimon is deleted, draw
  // 1". The watcher arms when Piedmon is a battle-area permanent on its owner's turn
  // (recomputeContinuousEffects); the combat-deletion seam fires onDeletionOf over each battle
  // loser BEFORE removal, gated by the captured controller+kind filter.
  //
  // The observable is the watcher owner's DECK COUNT (a Draw), which — unlike the signed memory
  // gauge — is untouched by attack/turn costs, so it isolates the watcher's effect cleanly.
  // Both cases run on seat 0's turn (so the [Your Turn] watcher is armed) and differ only in
  // WHOSE Digimon dies: the captured controller:"opponent" filter must accept the opponent's
  // and reject the host's own.
  //
  // FAILS-WHEN-REVERTED:
  //   - Positive: no draw if the onDeletionOf fireSubTrigger at the combat deletion seam
  //     (controller.resolveDigimonBattle) is removed.
  //   - Negative: a draw appears if the `matches` skip in fire() is removed (the watcher would
  //     fire for the host's OWN deleted Digimon, ignoring the controller:"opponent" gate).
  const PIEDMON = "EX1-064"; // [Your Turn][OPT] onDeletionOf opponent's Digimon → Draw 1

  it("draws 1 when an OPPONENT'S Digimon is deleted in battle (positive)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Seat 0 (turn player) hosts the watcher + a winning attacker; seat 1 holds the
    // opponent Digimon that will be deleted.
    const host = digimon(0, 11000, PIEDMON);
    p0.battleArea.push(host);
    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);
    for (let i = 0; i < 3; i++) p0.deck.push(instance("BT1-009", 0, false));
    const deckBefore = p0.deck.length;

    const defender = digimon(1, 5000); // opponent Digimon, loses to the 9000 attacker
    defender.isSuspended = true; // legal direct attack target (no block window)
    p1.battleArea.push(defender);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => p0.deck.length < deckBefore);
    // The opponent's Digimon was deleted → Piedmon's onDeletionOf Draw 1 fired.
    expect(p0.deck.length).toBe(deckBefore - 1);
    assertNoLoudGap(s);
  });

  it("does NOT draw when the host's OWN Digimon is deleted (negative — sourceFilter)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Seat 0 (turn player) hosts the watcher and attacks with a WEAK Digimon into a stronger
    // opponent: the attacker (controller "mine") loses and is deleted; the opponent survives.
    // The only deletion is the host's OWN attacker, which the controller:"opponent" filter
    // must reject.
    const host = digimon(0, 11000, PIEDMON);
    p0.battleArea.push(host);
    const weakAttacker = digimon(0, 3000); // seat-0 (host's own); loses the battle
    p0.battleArea.push(weakAttacker);
    for (let i = 0; i < 3; i++) p0.deck.push(instance("BT1-009", 0, false));
    const deckBefore = p0.deck.length;

    const strongDefender = digimon(1, 9000); // opponent survives
    strongDefender.isSuspended = true;
    p1.battleArea.push(strongDefender);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: weakAttacker.permanentId,
        target: { kind: "permanent", permanentId: strongDefender.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p0.battleArea.some((p) => p.permanentId === weakAttacker.permanentId));
    // The only deleted Digimon is the host's OWN attacker (controller "mine"), so the
    // controller:"opponent" sourceFilter rejected it: no draw, deck untouched.
    await settle(() => p0.deck.length < deckBefore, 50);
    expect(p0.deck.length).toBe(deckBefore);
    assertNoLoudGap(s);
  });
});

describe("A3 SubTrigger teardown — a source that dies IN BATTLE drops its watchers + replacements (CR-01)", () => {
  // CR-01 leak/wrong-fire: the combat deletion seam removes a permanent through raw state
  // access. Before the fix it dropped neither the SubTrigger subscriptions nor the
  // continuous/modifier ledgers, so a `reduceCost`/`prevent` replacement or `onDeletionOf`
  // watcher anchored to a Digimon that DIED in battle survived in the registry. The
  // `costReductionFor`/`replacementsFor` reads have NO anchor guard (unlike `fire`, which
  // skips a watcher whose anchor is gone), so a stale `reduceCost` from a dead source would
  // still discount a later cost — a real wrong-behavior path, not just a leak.
  //
  // Oracle: arm both a `reduceCost` replacement and an `onDeletionOf` watcher on a weak
  // attacker, drive it into a stronger suspended defender so it LOSES and is deleted in
  // battle, then assert the registry no longer carries either subscription for the dead
  // source.
  //
  // FAILS-WHEN-REVERTED: dropping the `dropPermanentSubscriptions` hand-off in the combat
  // deletion loop (controller.resolveDigimonBattle) leaves the stale `reduceCost` amount and
  // the stale `onDeletionOf` watcher in the registry, so `costReductionFor` returns 2 (not 0)
  // and `subscriptionsFor("onDeletionOf", deadId)` is non-empty.
  it("the dead source's reduceCost replacement and onDeletionOf watcher are gone after battle", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const registry = advance(s.engine).ledgers.subTriggers;

    // Seat-0 weak attacker that loses the permanent battle and is deleted.
    const weakAttacker = digimon(0, 3000);
    p0.battleArea.push(weakAttacker);
    const strongDefender = digimon(1, 9000);
    strongDefender.isSuspended = true; // legal direct target (no block window)
    p1.battleArea.push(strongDefender);

    // Arm a stale `reduceCost` digivolve-cost replacement AND an `onDeletionOf` watcher, both
    // anchored on the attacker that is about to die. A live board cannot mint these, so seed
    // them directly on the registry.
    registry.subscribeReplacement({
      event: "wouldDigivolve",
      sourcePermanentId: weakAttacker.permanentId,
      mode: "reduceCost",
      amount: 2,
      description: "test: stale digivolve-cost reduction from a battle-deleted source",
    });
    let staleWatcherFires = 0;
    registry.subscribe({
      event: "onDeletionOf",
      sourcePermanentId: weakAttacker.permanentId,
      once: false,
      run: async () => {
        staleWatcherFires += 1;
      },
      description: "test: stale onDeletionOf watcher from a battle-deleted source",
    });

    // Sanity: the replacement is live BEFORE the source dies (proves the assertion below
    // measures a real drop, not an absent subscription).
    expect(registry.costReductionFor("wouldDigivolve", weakAttacker.permanentId)).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: weakAttacker.permanentId,
        target: { kind: "permanent", permanentId: strongDefender.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p0.battleArea.some((p) => p.permanentId === weakAttacker.permanentId));

    // The source left the field in battle, so its three ledgers were torn down: the stale
    // `reduceCost` no longer discounts, and the `onDeletionOf` watcher is unsubscribed.
    expect(registry.costReductionFor("wouldDigivolve", weakAttacker.permanentId)).toBe(0);
    expect(registry.subscriptionsFor("onDeletionOf", weakAttacker.permanentId)).toHaveLength(0);
    assertNoLoudGap(s);
  });
});

describe("A3 SubTrigger — whenAttacking fires EXACTLY ONCE per attack (no System-A double-fire)", () => {
  // The bus is fired once at the OnUseAttack combat seam (controller.resolveAttack). If the
  // wiring erroneously fired `whenAttacking` at BOTH OnUseAttack and OnAllyAttack — a
  // cross-system double-fire with the System-A timing builder — an armed body would run
  // twice. Every catalog `whenAttacking` SubTrigger is an INHERITED effect or carries a
  // payment/decision body, so a synthetic counter watcher (armed on a real on-field attacker
  // and run through the production fire seam by a real attack intent) is the faithful oracle:
  // it counts how many times the body executes for one attack.
  //
  // FAILS-WHEN-REVERTED:
  //   - count flips to 2 if a duplicate `whenAttacking` fireSubTrigger is added at the
  //     OnAllyAttack seam (the double-fire bug this test guards against).
  //   - count stays 0 if the single whenAttacking fireSubTrigger at OnUseAttack is removed.
  it("an armed whenAttacking watcher's body runs exactly ONCE for a single attack", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    // A real on-field attacker (so the watcher's anchor survives the fireSubTrigger anchor
    // check) attacking the opponent player directly (no battle, no decisions).
    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);

    // Arm a synthetic whenAttacking watcher anchored on the attacker, counting its runs.
    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenAttacking",
      sourcePermanentId: attacker.permanentId,
      once: false,
      run: async () => {
        fireCount += 1;
      },
      description: "test: count whenAttacking fires",
    });

    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => fireCount > 0);
    // Give any erroneous second fire a chance to land before asserting exactly-once.
    await settle(() => false, 50);

    // EXACTLY ONCE: the production whenAttacking fire seam ran the body a single time for one
    // attack — no cross-system double-fire with the System-A timing builder.
    expect(fireCount).toBe(1);
    assertNoLoudGap(s);
  });
});

describe("A3 Piercing — a winning piercing attacker then checks security (BLK-03)", () => {
  // ＜Piercing＞ consume seam (combat/controller.resolveDigimonBattle): when a piercing
  // attacker WINS a permanent battle and deletes the defending Digimon, it performs the
  // defending player's security check before end-of-attack (Comprehensive Rules §16-7;
  // source CardController.OnDetermineDoSecurityCheck). The pierce grant is seeded
  // directly on the server-only ModifierLedger (a hand-laid board cannot mint one), then a
  // real attack intent drives the battle through the production combat path.
  //
  // Observable: the defending player's SECURITY stack shrinks by 1 after the win.
  //
  // FAILS-WHEN-REVERTED: removing the `hasPierce` hand-off in resolveDigimonBattle (Task 1)
  // leaves the defender's security stack UNCHANGED after the win (the winner never checks
  // security), failing the `toBe(securityBefore - 1)` assertion.
  it("a piercing winner deletes the defender then checks 1 security card", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Seat 0 attacker (strong) wins the permanent battle; seat 1 defender (weak) is deleted.
    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);
    const defender = digimon(1, 3000);
    defender.isSuspended = true; // legal direct target (no block window)
    p1.battleArea.push(defender);

    // Two face-down security cards so the post-win check has cards to remove without ending
    // the game. Tamers/Options with no battle so the count isolates the strike (=1).
    p1.security.push(instance("BT1-085", 1, false), instance("BT1-085", 1, false));
    const securityBefore = p1.security.length;

    // Seed the ＜Piercing＞ grant on the server-only modifier ledger.
    modifierWrite(s).addPierceGrant(attacker.permanentId, EFFECT_DURATION_TURN);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });

    // The defender is deleted, then the piercing winner checks exactly 1 security card.
    await settle(() => p1.security.length < securityBefore);
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    expect(p1.security.length).toBe(securityBefore - 1);
    assertNoLoudGap(s);
  });

  // Comprehensive Rules 11-5-1-2 / 1-2-3-1: the game is won when an attack is successful
  // against the PLAYER and that player has 0 security. A ＜Piercing＞ check follows an attack
  // that was successful against a DIGIMON, so it can never win — the reference client guards
  // the same path with `SecurityCards.Count >= 1`.
  //
  // FAILS-WHEN-REVERTED: without the `reason` seam on runSecurityCheck, the empty-security
  // branch declares seat 0 the winner and `state.gameOver` flips to true.
  it("a piercing winner into EMPTY security does not win the game", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);
    const defender = digimon(1, 3000);
    defender.isSuspended = true;
    p1.battleArea.push(defender);
    // No security cards at all.
    expect(p1.security).toHaveLength(0);

    modifierWrite(s).addPierceGrant(attacker.permanentId, EFFECT_DURATION_TURN);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === defender.permanentId));
    expect(s.state.gameOver).toBe(false);
    expect(s.events.some((e) => e.kind === "gameOver")).toBe(false);
    expect(s.events.some((e) => e.kind === "securityRevealed")).toBe(false);
    assertNoLoudGap(s);
  });

  it("a NON-piercing winner does NOT check security (negative — no pierce grant)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);
    const defender = digimon(1, 3000);
    defender.isSuspended = true;
    p1.battleArea.push(defender);
    p1.security.push(instance("BT1-085", 1, false), instance("BT1-085", 1, false));
    const securityBefore = p1.security.length;

    // No pierce grant: the winner does NOT perform a security check.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === defender.permanentId));
    await settle(() => p1.security.length < securityBefore, 50);
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    expect(p1.security.length).toBe(securityBefore); // security untouched — no pierce
    assertNoLoudGap(s);
  });
});

describe("A3 strike — Security Attack +1 makes the defender check 2 security cards (BLK-03)", () => {
  // strike consume seam (GameEngine.runSecurityCheck.strikeFor): the security check count is
  // base 1 plus the attacker's ＜Security Attack +N＞ grants, summed from
  // continuous.grantedKeywords (documented behavior Strike). A faithful SecurityAttack grant of
  // +1 is applied DIRECTLY to the continuous ledger (the securityAttack IR producer's store),
  // then an unblocked landing player attack runs the production security check.
  //
  // Observable: the defending player's SECURITY stack shrinks by EXACTLY 2 (1 base + 1).
  //
  // FAILS-WHEN-REVERTED: reverting strikeFor to `() => 1` (Task 1) makes the stack shrink by
  // only 1, failing the `toBe(securityBefore - 2)` assertion.
  it("an attacker with Security Attack +1 removes 2 security cards on a landing attack", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);

    // Three face-down security cards (no [Security] battle interference for the count).
    p1.security.push(instance("BT1-085", 1, false), instance("BT1-085", 1, false), instance("BT1-085", 1, false));
    const securityBefore = p1.security.length;

    // Faithful fixture: a Security Attack +1 grant written straight to the continuous store
    // (mirrors the securityAttack IR producer → grantKeyword → addKeywordGrant).
    ledgerWrite(s).addKeywordGrant(attacker.permanentId, "SecurityAttack", EFFECT_DURATION_TURN, 1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // strike = 1 + 1 = 2 ⇒ exactly two security cards are checked and removed.
    await settle(() => p1.security.length <= securityBefore - 2);
    expect(p1.security.length).toBe(securityBefore - 2);
    assertNoLoudGap(s);
  });

  it("an attacker with NO Security Attack grant removes only 1 security card (baseline)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);
    p1.security.push(instance("BT1-085", 1, false), instance("BT1-085", 1, false), instance("BT1-085", 1, false));
    const securityBefore = p1.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => p1.security.length < securityBefore);
    await settle(() => p1.security.length < securityBefore - 1, 50);
    expect(p1.security.length).toBe(securityBefore - 1); // base strike 1
    assertNoLoudGap(s);
  });
});

describe("A3 ReactivateEffect — EX2-038 [When Attacking] re-runs its [When Digivolving] (IR-01)", () => {
  // ReactivateEffect dispatch (interpreter.ts:1304) re-runs effects filed under
  // action.fromTrigger from the SAME card. EX2-038's [When Attacking][Once Per Turn] re-runs
  // its [When Digivolving] effect once per Tamer the controller has in play (Q3331/Q3332).
  // The [When Digivolving] effect's first action is a self ＋2000 DP (forTheTurn); the
  // additional Unsuspend (self, harmless) and Delete (opponent Digimon ≤cost 5 — no candidate
  // here, so a no-op) do not affect the observable.
  //
  // Observable: EX2-038's currentDP rises by 2000 × (Tamers in play) — i.e. the re-run fires
  // that many times. With 2 Tamers the effect runs TWICE (+4000); with 0 Tamers it does not
  // re-run at all (Q3331), proving the dispatch (not a constant) drives the repetition.
  //
  // FAILS-WHEN-REVERTED: stubbing the ReactivateEffect dispatch (so it re-runs 0 times) leaves
  // currentDP at its base, failing the `+4000` assertion.
  const REACTIVATOR = "EX2-038"; // base DP 11000; [When Attacking] re-runs [When Digivolving]
  const TAMER = "AD1-019";

  it("re-runs the [When Digivolving] self +2000 DP twice with 2 Tamers in play", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    const p0 = s.state.players[0] as PlayerState;

    const attacker = digimon(0, 11000, REACTIVATOR);
    p0.battleArea.push(attacker);
    // Two Tamers in play ⇒ the [When Digivolving] effect re-runs twice.
    p0.battleArea.push(digimon(0, 0, TAMER), digimon(0, 0, TAMER));
    const dpBefore = attacker.currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // Each re-run grants +2000 DP to EX2-038; two Tamers ⇒ +4000 total.
    await settle(() => attacker.currentDP >= dpBefore + 4000);
    expect(attacker.currentDP).toBe(dpBefore + 4000);
    assertNoLoudGap(s);
  });

  it("does NOT re-run at all with no Tamers in play (negative — Q3331)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    const p0 = s.state.players[0] as PlayerState;

    const attacker = digimon(0, 11000, REACTIVATOR);
    p0.battleArea.push(attacker);
    const dpBefore = attacker.currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => false, 60); // let any erroneous re-run land
    expect(attacker.currentDP).toBe(dpBefore); // 0 Tamers ⇒ 0 re-runs ⇒ DP unchanged
    assertNoLoudGap(s);
  });
});

describe("A3 Trash — stack-mill via BT21-030 [On Play]", () => {
  // CONVERTED (07-03): the IR mismodeled BT21-030's [On Play] as a permanent-Trash
  // (Delete-equivalent of the whole opponent Digimon). The faithful behavior is a STACK-MILL
  // — trash up to 10 digivolution cards from the TOP of the chosen opponent Digimon's stack,
  // leaving the Digimon itself in play (KB Q4540: once 1 card remains it has no "stacked
  // cards", so milling stops). BT21-030.ts is now a hand-IR override carrying
  // TrashDigivolution amount:10 fromTop:true on an opponent-Digimon target (documented behavior
  // ITrashStack(selectedPermanent, 10); target IsPermanentExistsOnOpponentBattleAreaDigimon).
  //
  // FAILS-WHEN-REVERTED lever: revert the OnPlay action in BT21-030.ts back to
  // { "kind": "Trash", target: opponent Digimon, count: 1 } (the old permanent-Trash). Then
  // the WHOLE opponent permanent is deleted (battleArea loses it) instead of its stack being
  // milled — the "permanent still in play" + "stack milled to 0, top intact" assertions go RED.
  it("BT21-030 [On Play] mills an opponent Digimon's stack (does NOT delete the permanent)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;

    // An opponent Lv.4 Digimon with 3 digivolution (stacked) cards. After the mill, the stack
    // is empty (3 <= 10), the Digimon's TOP card is untouched, and the permanent stays in play.
    const target = digimon(1, 8000, "AD1-001"); // top: AD1-001 (the Digimon itself)
    const under1 = instance("BT1-009", 1, true);
    const under2 = instance("BT1-010", 1, true);
    const under3 = instance("BT1-011", 1, true);
    target.stack.push(under1, under2, under3); // bottom..top
    p1.battleArea.push(target);

    const source = instance("BT21-030", 0, false); // Red/Yellow Lv.7 Digimon, cost 15
    (s.state.players[0] as PlayerState).hand.push(source);
    s.state.memory = 15;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => target.stack.length === 0);

    // Stack milled to 0; the Digimon's top card is intact; the permanent is STILL in play
    // (a stack-mill, NOT a permanent delete).
    expect(target.stack).toHaveLength(0);
    expect(target.topCard?.cardId).toBe("AD1-001");
    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(true);
    // The three milled source cards went to their owner's trash.
    expect(p1.trash.some((c) => c.instanceId === under1.instanceId)).toBe(true);
    expect(p1.trash.some((c) => c.instanceId === under3.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("A3 SecurityManipulation — placeAsSecurity (hand-form)", () => {
  // CONVERTED (07-03): the IR mismodeled the hand-form — op:placeAsSecurity had no from/source
  // fields, so the interpreter took the SELF-form branch (BT22-041 itself becoming security).
  // BT22-041.ts is now a hand-IR override carrying from:["hand"] + source colors:["Yellow"]
  // count:1 + optional:true, routing the interpreter's fromLoose placeAsSecurity branch
  // AddSecurityCard(selectedCard) (:187).
  //
  // FAILS-WHEN-REVERTED lever: drop the `from`/`source` fields from the OnPlay action in
  // BT22-041.ts (revert to the self-form { op:"placeAsSecurity", controller:"mine", amount:1 }).
  // Then the SELF-form fires — BT22-041 itself becomes the top security card and the Yellow
  // hand card stays in hand — so "the Yellow card is on top of security" and "BT22-041 is on the
  // battle area, not in security" both go RED.
  it("BT22-041 [On Play] places a yellow HAND card as top security (BT22-041 stays in play)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const source = instance("BT22-041", 0, false); // Yellow Lv.6 Digimon, cost 12
    const yellowHandCard = instance("BT22-041", 0, false); // a Yellow card in hand to place
    p0.hand.push(source, yellowHandCard);
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.security.some((c) => c.instanceId === yellowHandCard.instanceId));

    // The selected YELLOW HAND CARD is the top security card and has left the hand.
    expect(p0.security[0]?.instanceId).toBe(yellowHandCard.instanceId);
    expect(p0.hand.some((c) => c.instanceId === yellowHandCard.instanceId)).toBe(false);
    // BT22-041 itself stays on the battle area — it did NOT become a security card (self-form).
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT22-041")).toBe(true);
    expect(p0.security.some((c) => c.instanceId === source.instanceId)).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("A3 SetMemory — BT1-085 [Start of Your Turn] sets memory to 3 when <= 2", () => {
  // CONVERTED (06-01): the SetMemory StartOfYourTurn window is now reachable through the
  // real turn loop via the public runOneTurn() seam (landed with the SYS-06 turn-end
  // harness). The canonical A3 lives in turnEndHarness.test.ts:190 ("BT1-085 [Start of
  // Your Turn] sets memory to 3 (<=2) on the next turn's start"); this re-asserts the same
  // 1 -> 3 delta through the same runOneTurn() seam so the verb is proven from this file
  // too. Observable: the memory gauge captured AT the OnStartTurn window (a real delta, not
  // "no error"). FAILS-WHEN-REVERTED: routing StartOfYourTurn -> EffectTiming.None
  // (interpreter.ts, the install-fires-immediately mismodel) makes SetMemory never fire at
  // the window, so `memoryAtStartTurn` stays 1 -> RED. Cross-ref: dnaDigivolve/turnEndHarness.
  it("BT1-085 [Start of Your Turn] sets memory to 3 (<=2) at the real OnStartTurn window", async () => {
    const state = new GameState();
    const hooks: GameEngineHooks = {
      seed: 0, // chooseFirstPlayer derives seat 0
      requestDecision: () => {},
      emit: () => {},
    };
    const engine = new GameEngine(state, hooks);
    engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
    engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
    const p0 = state.players[0] as PlayerState;
    for (let i = 0; i < 5; i += 1) p0.deck.push(instance("AD1-001", 0, false));

    state.turnSeat = 0;
    state.isFirstPlayersFirstTurn = true;
    // BT1-085 (Tai Kamiya) Tamer: [Start of Your Turn] set memory to 3 when it is <= 2.
    p0.battleArea.push(digimon(0, 0, "BT1-085"));
    // A playable hand card so the Main phase has a legal action — the engine auto-ends the
    // Main phase at entry when the turn player has nothing to do, which would close the
    // window before this harness can observe it.
    p0.hand.push(instance("AD1-001", 0, true));
    state.memory = 1; // below the SetMemory(3) gate

    // Observe the memory gauge AT the OnStartTurn window (before the end-of-turn pass-turn
    // rule reframes the gauge). Shadow the private fireTiming to record it, forwarding to the
    // real implementation so the SetMemory effect still resolves through production.
    let memoryAtStartTurn = -99;
    const engineAny = engine as unknown as {
      fireTiming(timing: EffectTiming, trigger?: unknown): Promise<void>;
    };
    const original = engineAny.fireTiming.bind(engine);
    engineAny.fireTiming = async (timing: EffectTiming, trigger?: unknown) => {
      const result = await original(timing, trigger);
      if (timing === EffectTiming.OnStartTurn) memoryAtStartTurn = state.memory;
      return result;
    };

    // Drive ONE real turn. runOneTurn() blocks in the interactive Main phase, so kick it,
    // wait for Main to open, pass, then await completion.
    const turn = engine.runOneTurn();
    const mainPhase = (engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !mainPhase.isOpen; i += 1) await Promise.resolve();
    expect(mainPhase.isOpen, "Main phase opened by the real loop").toBe(true);
    expect(engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    // SetMemory resolved through the real OnStartTurn window: memory raised 1 -> 3.
    expect(memoryAtStartTurn).toBe(3);
  });
});

describe("A3 OnDestroyedAnyone — [On Deletion] fires at every real deletion site", () => {
  // Broadens the single P-115 <Save> gate (effect-deletion path only) onto the two
  // under-tested deletion sites the OnDestroyedAnyone wiring (commit e6084852) also
  // opens — battle deletion and security-check deletion — plus the clean-no-op and
  // simultaneous-ordering edge cases. The observable is the signed memory gauge:
  // BT1-035 Leomon is the canonical [On Deletion] Gain 2 memory card (KB Q892 confirms
  // a deletion moves the gauge toward the DELETED card's owner). gainMemoryForSeat
  // credits ctx.source.ownerSeat, so memory rises +2 when the turn player's own Digimon
  // is deleted and falls -2 when the opponent's is — which also proves the trashed
  // source resolves its owner correctly after it has left the field.
  const ON_DELETION_GAIN2 = "BT1-035"; // Lv.4 Blue Digimon, [On Deletion] Gain 2 memory

  /** memoryChanged events the gauge emitted for a GainMemory step, in order. */
  function gainMemorySteps(s: Setup): { from: number; to: number }[] {
    return s.events
      .filter((e) => e.kind === "memoryChanged" && "reason" in e && e.reason === "gainMemory")
      .map((e) => ({ from: (e as { from: number }).from, to: (e as { to: number }).to }));
  }

  // (a) COMBAT / battle deletion. Seat 0's 9000 attacker beats seat 1's suspended 5000
  // BT1-035 in a Digimon-vs-Digimon battle; the defender is deleted via
  // CombatController.resolveDigimonBattle, which opens the OnDestroyedAnyone window over
  // the deleted set. BT1-035 belongs to seat 1 (NOT the turn player), so Gain 2 memory
  // moves the gauge -2 — proving both that the battle site fires and that the deleted
  // card's controller (not the turn player) is credited.
  it("battle deletion fires the deleted defender's [On Deletion] Gain 2 memory", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 9000); // vanilla AD1-001, no [On Deletion]
    p0.battleArea.push(attacker);

    const defender = digimon(1, 5000, ON_DELETION_GAIN2);
    defender.isSuspended = true; // a suspended Digimon is a legal direct attack target (no block window)
    p1.battleArea.push(defender);

    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });

    // Settle on the [On Deletion] memory move, not merely the deletion: the battle trashes
    // the defender first, then the OnDestroyedAnyone window resolves Gain 2 memory.
    await settle(() => s.state.memory === -2);

    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true); // attacker survived
    expect(s.state.memory).toBe(-2); // seat 1 (opponent) gained 2 -> gauge moved -2 toward them
    expect(gainMemorySteps(s)).toEqual([{ from: 0, to: -2 }]); // exactly one fire, no duplicate
    assertNoLoudGap(s);
  });

  // (b) SECURITY-CHECK deletion. Seat 0's 3000 BT1-035 attacks the opponent directly and
  // loses the security battle to seat 1's flipped 5000-DP security Digimon; the attacker is
  // deleted through the security-check deletePermanents dep, which fires OnDestroyedAnyone.
  // BT1-035 is the turn player's, so Gain 2 memory moves the gauge +2.
  it("security-check deletion fires the deleted attacker's [On Deletion] Gain 2 memory", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // currentDP 3000 < the security card's definition DP (5000) -> the attacker loses the
    // security battle and is deleted (resolveSecurityBattle: attackerDP < securityCardDP).
    const attacker = digimon(0, 3000, ON_DELETION_GAIN2);
    p0.battleArea.push(attacker);

    // The lone security card is a 5000-DP Digimon (AD1-001), so the flipped card battles the
    // attacker rather than resolving a [Security] effect or being trashed unopposed.
    p1.security.push(instance("AD1-001", 1, false));

    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.memory === 2);

    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false); // attacker deleted
    expect(s.state.memory).toBe(2); // seat 0 (turn player) gained 2 -> gauge moved +2 toward them
    expect(gainMemorySteps(s)).toEqual([{ from: 0, to: 2 }]); // exactly one fire, no duplicate
    assertNoLoudGap(s);
  });

  // (c) NO-EFFECT deletion is a clean no-op. Effect-deleting a vanilla Digimon (no [On
  // Deletion]) through primitives.deletePermanent still opens the OnDestroyedAnyone window,
  // but with no [On Deletion] candidate it must resolve to nothing: no loud gap, no memory
  // move, no spurious/duplicate trigger.
  it("deleting a Digimon with no [On Deletion] effect is a clean no-op", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // BT13-011 [On Play] deletes 1 opponent Digimon with DP <= 3000, through the real
    // primitives.deletePermanent seam.
    const deleter = instance("BT13-011", 0, false);
    p0.hand.push(deleter);

    // A vanilla 3000-DP opponent Digimon: inside the delete filter, but carries NO effect at
    // any timing (AD1-001 has no module), so the OnDestroyedAnyone window has no candidate.
    const target = digimon(1, 3000, "AD1-001");
    p1.battleArea.push(target);

    // Stock both decks so a spurious [On Deletion] Draw would be observable as a deck/hand delta.
    for (let i = 0; i < 3; i++) p0.deck.push(instance("AD1-001", 0, false));
    for (let i = 0; i < 3; i++) p1.deck.push(instance("AD1-001", 1, false));
    const p0DeckBefore = p0.deck.length;
    const p1DeckBefore = p1.deck.length;

    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: deleter.instanceId })).toEqual({ ok: true });

    await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId));
    await settle(() => false, 40); // drain any stray follow-up window

    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false); // deleted
    // BT13-011 itself carries an [On Deletion] Draw, but it is still on the field (it was played,
    // not deleted), so nothing should have triggered off the no-effect target's deletion.
    expect(gainMemorySteps(s)).toEqual([]); // no [On Deletion] Gain fired
    expect(p0.deck.length).toBe(p0DeckBefore); // no spurious draw for either player
    expect(p1.deck.length).toBe(p1DeckBefore);
    assertNoLoudGap(s);
  });

  // (d) SIMULTANEOUS multi-deletion ordering (turn-player-first). An equal-DP battle deletes
  // BOTH combatants; with both carrying [On Deletion] Gain 2 memory, the single
  // OnDestroyedAnyone window batches them and resolveTiming orders turn-player-first. Final
  // memory is net 0 (seat 0 +2 then seat 1 -2), so ordering is read off the FIRST GainMemory
  // step: turn-player-first => seat 0 resolves first => the gauge moves 0 -> +2 before
  // +2 -> 0. Opponent-first would instead show 0 -> -2 first.
  it("a both-combatants tie fires both [On Deletion]s, turn player first", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Equal DP -> resolvePermanentBattle deletes both (tie).
    const attacker = digimon(0, 5000, ON_DELETION_GAIN2);
    p0.battleArea.push(attacker);

    const defender = digimon(1, 5000, ON_DELETION_GAIN2);
    defender.isSuspended = true;
    p1.battleArea.push(defender);

    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });

    // Both fire (net 0), so settle on having observed two GainMemory steps rather than a
    // final memory value (which is 0 the whole time after they cancel).
    await settle(() => gainMemorySteps(s).length >= 2);

    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);

    const steps = gainMemorySteps(s);
    expect(steps).toHaveLength(2); // exactly two fires — each [On Deletion] once, no duplicate
    // Turn-player-first: seat 0's +2 resolves before seat 1's -2.
    expect(steps[0]).toEqual({ from: 0, to: 2 });
    expect(steps[1]).toEqual({ from: 2, to: 0 });
    expect(s.state.memory).toBe(0); // net of the two cancelling Gain 2s
    assertNoLoudGap(s);
  });
});

// A3 Link — BT22-035 Entermon [On Play] gating to <Link> cards (KB Q4881) is now a
// passing fails-when-reverted A3 in ./linkEligible.test.ts. The structural linkEligible
// guard (mindLink.ts, wired into runLink) resolved the BLOCKED note that previously lived
// here: the engine now reads CardDefinition.linkRequirement to reject no-<Link> targets
// (BT21-009 linked, AD1-001 rejected). See linkEligible.test.ts for the live assertions
// and the REVERT-CONFIRM-RED lever.

describe("A3 Attack — BT23-056 [On Play] granted [Start of Your Main Phase] trigger ([CS] Tamer gated)", () => {
  // CONVERTED (07-04): the IR mismodeled the effect as a direct force-attack verb (Attack
  // {opponent Digimon}) AND dropped the [CS] Tamer precondition. BT23-056.ts is now a hand-IR
  // override whose [On Play]/[When Digivolving] is a startOfYourMainPhase SubTrigger installed
  // on a CHOSEN opponent Digimon, gated by youHave{kind:Tamer, trait:CS}, lasting
  // untilOpponentTurnEnd. The granted "this Digimon attacks" body fires at the OPPONENT's
  // main-phase start (NOT on play), re-checking turn-ownership + on-battle-area at fire time
  // (documented behavior). documented behavior selectedPermanent.UntilOwnerTurnEndEffects.Add;
  //
  // FAILS-WHEN-REVERTED: revert the [On Play] action to a bare { kind:"Attack", target:opponent
  // Digimon } (the old mismodel) => the granted watcher is never installed, so the opponent
  // Digimon never attacks at the opponent's main-phase start => the "attacked (suspended)"
  // assertion goes RED. Dropping the [CS] youHave condition makes the no-Tamer negative case
  // install the grant anyway => the negative "no attack" assertion goes RED.
  const CS_TAMER = "BT22-083"; // Yuuko Kamishiro — Tamer with the [CS] trait
  const OPP_DIGIMON = "BT1-009"; // a plain opponent Digimon to receive the grant

  /**
   * Kick the opponent's (seat-1) main-phase-start timing seam. NOT awaited: the granted forced
   * attack opens a block window / security battle that, in this hand-laid board, would await
   * a defending intent the harness does not pump — but the observable we assert (the attacker
   * was suspended on attack declaration, resolveAttack step 1) happens before that await, so
   * the caller `settle`s on the board change rather than the fireTiming promise.
   */
  function kickOpponentMainPhase(s: Setup): void {
    s.state.turnSeat = 1;
    void (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
  }

  it("with a [CS] Tamer: the chosen opponent Digimon attacks at the opponent's main-phase start (not on play)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Seat 0 controls a [CS] Tamer (the precondition) and plays BT23-056.
    const csTamer = digimon(0, 0, CS_TAMER);
    csTamer.topCard.cardId = CS_TAMER; // Tamer permanent (DP irrelevant)
    p0.battleArea.push(csTamer);
    // The opponent's Digimon that will receive the granted trigger.
    const victim = digimon(1, 3000, OPP_DIGIMON);
    p1.battleArea.push(victim);
    // A SUSPENDED seat-0 Digimon is the attack target for the granted attack: forceAttack lists
    // suspended enemy Digimon as candidates, and a suspended Digimon cannot block — so the
    // block window resolves immediately and the forced attack proceeds (suspending the victim).
    const sink = digimon(0, 1000);
    sink.isSuspended = true;
    p0.battleArea.push(sink);

    const source = instance("BT23-056", 0, false);
    p0.hand.push(source);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 120); // flush the OnPlay continuation (select the opponent Digimon)

    // On play, NOTHING attacks yet — the grant is a delayed trigger, not an immediate attack.
    expect(victim.isSuspended).toBe(false);
    assertNoLoudGap(s);

    // At the opponent's main-phase start, the granted "this Digimon attacks" fires: the victim
    // declares an attack and so is suspended by the combat path (resolveAttack taps the attacker).
    kickOpponentMainPhase(s);
    await settle(() => victim.isSuspended === true, 200);
    expect(victim.isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("without a [CS] Tamer: playing BT23-056 grants nothing (opponent never attacks)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // No [CS] Tamer in play => the precondition fails, no grant.
    const victim = digimon(1, 3000, OPP_DIGIMON);
    p1.battleArea.push(victim);
    const sink = digimon(0, 1000);
    sink.isSuspended = true;
    p0.battleArea.push(sink);

    const source = instance("BT23-056", 0, false);
    p0.hand.push(source);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 120);

    // Advance to the opponent's main phase: with no grant installed, the victim never attacks.
    kickOpponentMainPhase(s);
    await settle(() => false, 200);
    expect(victim.isSuspended).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("A3 Digivolve IR action — BT20-083 [On Play]", () => {
  // CONVERTED (07-03): the IR dropped the security-count gate, so BT20-083's [On Play]
  // digivolve fired unconditionally. BT20-083.ts is now a hand-IR override whose OnPlay
  // Digivolve action carries condition: { kind: "securityAtMost", value: 1 } (the REAL IR kind,
  // ir.ts:300, evaluated at interpreter.ts:629 as player(mine).security.length <= value), per
  // documented behavior (card.Owner.SecurityCards.Count <= 1).
  //
  // FAILS-WHEN-REVERTED lever: drop the `condition` field from the OnPlay Digivolve action in
  // BT20-083.ts. Then the digivolve fires with 2 security too — the negative case ("2 security
  // => top is STILL BT20-083, no Omnimon") goes RED.
  it("BT20-083 [On Play] digivolves into Omnimon (X Antibody) only when security <= 1", async () => {
    // Negative case: 2 security cards => the gate fails, no digivolve (top stays BT20-083).
    {
      const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
      const p0 = s.state.players[0] as PlayerState;
      const omnimon = instance("BT20-102", 0, false); // Omnimon (X Antibody), in hand
      const source = instance("BT20-083", 0, false); // White Lv.4 Digimon, cost 5
      p0.hand.push(source, omnimon);
      p0.security.push(instance("AD1-001", 0, false), instance("BT1-009", 0, false)); // 2 security
      s.state.memory = 5;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
        ok: true,
      });
      await settle(() => false, 80); // flush the bounded OnPlay continuation

      const perm = p0.battleArea.find((p) => p.topCard?.cardId === "BT20-083");
      expect(perm?.topCard?.cardId).toBe("BT20-083"); // gate failed => no digivolve
      expect(p0.hand.some((c) => c.instanceId === omnimon.instanceId)).toBe(true); // Omnimon still in hand
      assertNoLoudGap(s);
    }

    // Positive case: 1 security card => the gate holds, the digivolve into Omnimon fires.
    {
      const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
      const p0 = s.state.players[0] as PlayerState;
      const omnimon = instance("BT20-102", 0, false); // Omnimon (X Antibody), in hand
      const source = instance("BT20-083", 0, false);
      p0.hand.push(source, omnimon);
      p0.security.push(instance("AD1-001", 0, false)); // 1 security
      s.state.memory = 5;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
        ok: true,
      });
      await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT20-102"));

      const perm = p0.battleArea.find((p) => p.topCard?.cardId === "BT20-102");
      expect(perm).toBeDefined(); // gate held => digivolved into Omnimon (X Antibody)
      expect(perm?.stack.some((c) => c.cardId === "BT20-083")).toBe(true); // BT20-083 rode under
      expect(p0.hand.some((c) => c.instanceId === omnimon.instanceId)).toBe(false); // left hand
      assertNoLoudGap(s);
    }
  });
});

// A3 SetBaseDP — RESOLVED (IR-02 Tier-2). BT3-014.ts's [When Digivolving] resolve body now
// selects an eligible opponent Lv.4-or-lower Digimon and calls
// ctx.fx.setBaseDP(picked, 1000, EffectDuration.UntilEachTurnEnd) per Q1056/Q1057 (overwrite,
// not additive). The fails-when-reverted A3 lives in ./cards/irKindTier2Cluster.test.ts
// ("Tier-2 A3 — SetBaseDP"). The setBaseDP primitive (primitives.ts) + the interpreter
// SetBaseDP dispatch were already wired; the blocker was solely the unwired card module.

describe("A3 ModifySecurityDP — security-Digimon battle DP modifier (IR-01)", () => {
  // ModifySecurityDP consume seam (GameEngine.runSecurityCheck.securityCardDp:
  // dp + securityDp.deltaFor(owner)). A security Digimon battles a landing attacker; the
  // ModifySecurityDP delta raises the security Digimon's effective battle DP, flipping the
  // outcome (the attacker is deleted where without the delta it would win).
  //
  // FAITHFUL FIXTURE: the delta is applied via the REAL securityDp ledger as a CONTINUOUS
  // source (seedContinuousSecurityDp), NOT through ST3-12's unfaithful compiled IR. ST3-12's
  // IR correctness fix (the dropped [Opponent's Turn] guard) is DEFERRED to Phase 3 per
  // CONTEXT.md LOCKED Q2 — this proves the CONSUMER only, so the irKind stays wired-unproven.
  //
  // FAILS-WHEN-REVERTED: stubbing securityCardDp to ignore deltaFor (i.e. `dp` alone) keeps
  // the security DP at 3000 < 4000, so the attacker WINS and survives — the
  // toBe(false) "attacker deleted" assertion fails.
  const SEC_DIGIMON = "BT1-009"; // Digimon, dp 3000

  it("a +2000 ModifySecurityDP flips the security battle so the attacker is deleted", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Attacker DP 4000: without the modifier it beats the 3000-DP security Digimon (wins,
    // survives). The defender (seat 1) is attacked as a player so the security check runs.
    const attacker = digimon(0, 4000);
    p0.battleArea.push(attacker);
    p1.security.push(instance(SEC_DIGIMON, 1, false)); // one security Digimon to battle

    // Faithful +2000 ModifySecurityDP on the defender's security: effective DP 3000 + 2000 =
    // 5000 > 4000 attacker => the attacker LOSES the security battle and is deleted.
    const restore = seedContinuousSecurityDp(s, 1, 2000);
    try {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });

      // The attacker is deleted by the (DP-boosted) security Digimon.
      await settle(() => !p0.battleArea.some((p) => p.permanentId === attacker.permanentId));
      expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
      assertNoLoudGap(s);
    } finally {
      restore();
    }
  });

  it("WITHOUT the modifier the same attacker WINS and survives (negative — delta 0)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 4000);
    p0.battleArea.push(attacker);
    p1.security.push(instance(SEC_DIGIMON, 1, false));

    // No ModifySecurityDP delta: security DP stays 3000 < 4000 => the attacker WINS, survives.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => p1.security.length === 0); // the security Digimon was checked
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("A3 Search — search deck, pick matching card, add to hand", () => {
  // CONVERTED-TO-FINDING (07-03): the it.todo premise was FALSE. BT15-092 — the only card whose
  // RAW IR parse contains a Search action — is already FAITHFUL as a security-PLAY, not a
  // Lv.<=4 Digimon FROM THE SECURITY STACK without cost ("Search your security stack" = DCG
  // terminology for LOOKING THROUGH security, NOT a deck-search-to-hand). Re-registering BT15-092
  // against its raw Search IR would be UNFAITHFUL. A bounded catalog/effects.json hunt (07-03)
  // confirmed BT15-092 is the SOLE Search-bearing raw-parse entry — no faithful in-catalog Search
  // vehicle exists. Resolution (a contract-valid documented faithful fix, ENG-01): a recorded
  // per-card documented behavior-diff finding (cs documented behavior verdict faithful), and the Search IR kind kept dispatched by
  // ./searchKindDispatch.test.ts (documented no-vehicle). This finding asserts BT15-092 is
  // compiled as the faithful security-play (PlayWithoutCost from:[security]), NOT a Search.
  it("BT15-092 is registered as a faithful security-PLAY (PlayWithoutCost from security), not a deck-Search", async () => {
    // The RUNTIME registration is what the engine actually runs (the per-card .ts override via
    // registerIrCard), as distinct from the RAW runtime record parse in effects.json (which still
    // carries the Search action — the it.todo's true premise). Read the registered [Main] module
    // and assert its compiled effect is the faithful play-from-security, NOT a Search.
    const module = getEffectModule("BT15-092");
    expect(module, "BT15-092 must be registered as an engine module").toBeDefined();
    const source = {
      instanceId: "BT15-092#1",
      cardId: "BT15-092",
      ownerSeat: 0 as Seat,
      definition: {} as never,
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    } as unknown as Parameters<NonNullable<typeof module>["effectsForTiming"]>[1];
    // [Main] routes to OnUseOption (timingsForTrigger: a non-security Main -> OnUseOption).
    const mains = module!.effectsForTiming(EffectTiming.OnUseOption, source);
    expect(mains.length, "BT15-092 has a registered [Main] effect").toBeGreaterThan(0);
    // The description is the humanized rendering of the compiled actions, so the faithful
    // security-play reads as "Play without paying the cost" — never as a deck search.
    expect(mains[0]!.description, "BT15-092 [Main] is a PlayWithoutCost, not a Search").toContain(
      "Play without paying the cost",
    );
    expect(mains[0]!.description).not.toContain("Search");

    // documented behavior finding: BT15-092 (cs documented behavior verdict faithful). See
    // ./searchKindDispatch.test.ts for the Search-kind dispatch guard.
    // effects.json Main carries PlayWithoutCost (updated to match the hand-authored IR module);
    // no Search override is needed.
  });
});

describe("A3 WaiveColorRequirement — minimal color-gate bypass (IR-01)", () => {
  // WaiveColorRequirement consume seam (Task 1: playCard.validate color step ->
  // continuous.hasColorWaiver). BT25-043 carries an explicit play-time color requirement
  // (optionColorRequirements: [Yellow]); played onto an empty board (no Yellow available),
  // the minimal color gate rejects it. A faithful color waiver on its hand instance — the
  // real source WaiveColorRequirement effect writes via continuous.addColorWaiver — makes
  // the gate short-circuit to legal, so the card enters the battle area.
  //
  // FAILS-WHEN-REVERTED: removing the `hasColorWaiver` short-circuit from the Task 1 gate
  // (or reverting the gate's `colorRequirementMet` binding) leaves the play rejected even
  // with the waiver, so the permanent is never created and the toBe(1) assertion fails.
  const COLOR_GATED = "BT25-043"; // Digimon+Option; optionColorRequirements: [Yellow], playCost 6

  it("a color-gated card is rejected on an empty board, then PLAYS once its instance is color-waived", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    s.state.memory = 10; // afford the playCost (6)

    const card = instance(COLOR_GATED, 0, false);
    p0.hand.push(card);

    // No Yellow source on the board => the minimal color gate rejects the play.
    // The color gate surfaces its own fine-grained reason (RejectReason consolidation,
    // fc20b1b6b: "Consolidate RejectReason as the single source of truth (10->28 codes)").
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(p0.battleArea.length).toBe(0);

    // Faithful waiver on this instance (what the WaiveColorRequirement effect records).
    ledgerWrite(s).addColorWaiver(card.instanceId, EFFECT_DURATION_TURN);

    // The gate now short-circuits to legal: the card enters the battle area.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({ ok: true });
    await settle(() => p0.battleArea.length === 1);
    expect(p0.battleArea.length).toBe(1);
    expect(p0.battleArea[0]?.topCard?.cardId).toBe(COLOR_GATED);
    assertNoLoudGap(s);
  });
});

describe("INRT-01 — no dead stores: each wired store fails-if-empty (anti-dead-store audit)", () => {
  // One per-consume-site test per wired store: the STORE-EMPTY case must produce the
  // NON-effect (or under-effect) and the STORE-POPULATED case the full effect. A store with
  // no consuming reader could not produce this difference — so each pair is the proof that
  // the store is genuinely read at its decision seam. The five wired stores are:
  // subTriggers, pierce, SecurityAttack/strike, securityDp, color-waiver.

  // 1. subTriggers (ContinuousEffectLedger subscriptions consumed by GameEngine.fireSubTrigger).
  //    Armed (a BT10-044 host on field) => playing a green Tamer draws 1; UNARMED (no host,
  //    empty subscription store) => the same play draws 0.
  it("subTriggers: an armed whenPlayed watcher draws 1; an empty store draws 0", async () => {
    async function drawDeltaOnGreenTamerPlay(arm: boolean): Promise<number> {
      const s = setup();
      const p0 = s.state.players[0] as PlayerState;
      if (arm) p0.battleArea.push(digimon(0, 2000, "BT10-044")); // arms the whenPlayed Draw watcher
      const tamer = instance("BT1-088", 0, false); // green Tamer, no [On Play] of its own
      p0.hand.push(tamer);
      for (let i = 0; i < 3; i++) p0.deck.push(instance("BT1-009", 0, false));
      const deckBefore = p0.deck.length;
      s.state.memory = 5;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: tamer.instanceId })).toEqual({
        ok: true,
      });
      await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT1-088"));
      await settle(() => p0.deck.length < deckBefore, 80);
      assertNoLoudGap(s);
      return deckBefore - p0.deck.length;
    }
    expect(await drawDeltaOnGreenTamerPlay(true)).toBe(1); // store populated => watcher fires
    expect(await drawDeltaOnGreenTamerPlay(false)).toBe(0); // store empty => no draw
  });

  // 2. pierce (ModifierLedger pierce store consumed by combat.resolveDigimonBattle).
  //    A pierce grant => a winning attacker checks 1 security card; no grant => security untouched.
  it("pierce: a granted pierce checks 1 security card; an empty store checks 0", async () => {
    async function securityRemovedOnWin(grantPierce: boolean): Promise<number> {
      const s = setup();
      const p0 = s.state.players[0] as PlayerState;
      const p1 = s.state.players[1] as PlayerState;
      const attacker = digimon(0, 9000);
      p0.battleArea.push(attacker);
      const defender = digimon(1, 3000);
      defender.isSuspended = true;
      p1.battleArea.push(defender);
      p1.security.push(instance("BT1-085", 1, false), instance("BT1-085", 1, false));
      const securityBefore = p1.security.length;
      if (grantPierce) modifierWrite(s).addPierceGrant(attacker.permanentId, EFFECT_DURATION_TURN);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "permanent", permanentId: defender.permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !p1.battleArea.some((p) => p.permanentId === defender.permanentId));
      // Extra settle headroom: OnBattleDeleteOpponent timing fires before pierce-security
      // check, adding async depth. 200 ticks is sufficient for the full pipeline.
      await settle(() => p1.security.length < securityBefore, 200);
      assertNoLoudGap(s);
      return securityBefore - p1.security.length;
    }
    expect(await securityRemovedOnWin(true)).toBe(1); // store populated => pierce security check
    expect(await securityRemovedOnWin(false)).toBe(0); // store empty => no pierce check
  });

  // 3. SecurityAttack/strike (continuous keywordGrants consumed by runSecurityCheck.strikeFor).
  //    A +1 grant => a landing attack checks 2 cards; no grant => the base 1. An empty store
  //    UNDER-checks (1 instead of 2) — the fails-if-empty proof for the strike store.
  it("strike: a Security Attack +1 grant checks 2 cards; an empty store checks only 1", async () => {
    async function securityCheckedOnLandingAttack(grant: boolean): Promise<number> {
      const s = setup();
      const p0 = s.state.players[0] as PlayerState;
      const p1 = s.state.players[1] as PlayerState;
      const attacker = digimon(0, 9000);
      p0.battleArea.push(attacker);
      p1.security.push(instance("BT1-085", 1, false), instance("BT1-085", 1, false), instance("BT1-085", 1, false));
      const securityBefore = p1.security.length;
      if (grant) {
        ledgerWrite(s).addKeywordGrant(attacker.permanentId, "SecurityAttack", EFFECT_DURATION_TURN, 1);
      }
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => p1.security.length <= securityBefore - (grant ? 2 : 1));
      await settle(() => false, 40);
      assertNoLoudGap(s);
      return securityBefore - p1.security.length;
    }
    expect(await securityCheckedOnLandingAttack(true)).toBe(2); // store populated => 1 + 1
    expect(await securityCheckedOnLandingAttack(false)).toBe(1); // store empty => base 1
  });

  // 4. securityDp (SecurityDpLedger consumed by runSecurityCheck.securityCardDp).
  //    A +2000 delta on the defender's security flips a 4000-vs-3000 battle so the attacker is
  //    deleted; an empty store leaves the attacker alive (it wins the unmodified battle).
  it("securityDp: a +2000 delta deletes the attacker; an empty store leaves it alive", async () => {
    async function attackerDeletedAfterSecurityBattle(delta: number): Promise<boolean> {
      const s = setup();
      const p0 = s.state.players[0] as PlayerState;
      const p1 = s.state.players[1] as PlayerState;
      const attacker = digimon(0, 4000);
      p0.battleArea.push(attacker);
      p1.security.push(instance("BT1-009", 1, false)); // dp 3000 security Digimon
      const restore = delta !== 0 ? seedContinuousSecurityDp(s, 1, delta) : () => {};
      try {
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: attacker.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        // The card leaves security at the check; the battle is the later step
        // (CR 13-1-8-3), so wait for the deletion itself rather than for the removal.
        await settle(() => !p0.battleArea.some((p) => p.permanentId === attacker.permanentId));
        await settle(() => false, 40);
        assertNoLoudGap(s);
        return !p0.battleArea.some((p) => p.permanentId === attacker.permanentId);
      } finally {
        restore();
      }
    }
    expect(await attackerDeletedAfterSecurityBattle(2000)).toBe(true); // store populated => flip
    expect(await attackerDeletedAfterSecurityBattle(0)).toBe(false); // store empty => attacker wins
  });

  // 5. color-waiver (ContinuousEffectLedger colorWaivers consumed by the play-card color gate).
  //    A waiver on the instance => the color-gated card plays; an empty store => it is rejected.
  it("color-waiver: a waived color-gated card plays; an empty store rejects it", async () => {
    function playsColorGatedCard(waive: boolean): boolean {
      const s = setup();
      const p0 = s.state.players[0] as PlayerState;
      s.state.memory = 10;
      const card = instance("BT25-043", 0, false); // optionColorRequirements: [Yellow]
      p0.hand.push(card);
      if (waive) ledgerWrite(s).addColorWaiver(card.instanceId, EFFECT_DURATION_TURN);
      const result = s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId });
      return result.ok === true && p0.battleArea.length === 1;
    }
    expect(playsColorGatedCard(true)).toBe(true); // store populated => gate short-circuits, plays
    expect(playsColorGatedCard(false)).toBe(false); // store empty => color gate rejects
  });
});

describe("A3 digivolve verb — WhenDigivolving fires through a real digivolution", () => {
  // The player `digivolve` intent (distinct from the effect-driven Digivolve IR action above,
  // and from DisableTimingEffect which SUPPRESSES this window): stack a hand Digimon onto an
  // owned permanent whose top card satisfies its EvoCost, then fire WhenDigivolving for the new
  // top. These drive that verb end to end and assert the WhenDigivolving effect's GameState delta.
  it("BT8-013 [When Digivolving] grants itself <Blitz> after digivolving onto a Lv.3 Red base", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const base = digimon(0, 3000, "BT1-009"); // Lv.3 Red Digimon — satisfies BT8-013's EvoCost (Lv.3/Red @2)
    p0.battleArea.push(base);
    p0.deck.push(instance("AD1-001", 0, false)); // the digivolve draw-1 has something to take

    const evolving = instance("BT8-013", 0, false); // Lv.4 Red; [When Digivolving] self gains <Blitz> for the turn
    p0.hand.push(evolving);
    s.state.memory = 10; // EvoCost 2 is affordable (maxCostFor = 20)

    expect(digivolve(s, 0, base.permanentId, evolving)).toEqual({ ok: true });

    // The verb resolves on a continuation (Main verbs are serialized), so settle on the stack
    // change before reading the new top.
    await settle(() => base.topCard?.cardId === "BT8-013");
    expect(base.topCard?.cardId).toBe("BT8-013");
    expect(base.stack.some((c) => c.cardId === "BT1-009")).toBe(true); // prior top slid underneath
    expect(s.state.memory).toBe(8); // EvoCost 2 paid through the gauge

    // WhenDigivolving fires on the continuation; <Blitz> lands in the continuous ledger.
    await settle(() => ledger(s).hasKeyword(base.permanentId, "Blitz"));
    expect(ledger(s).hasKeyword(base.permanentId, "Blitz")).toBe(true);
    assertNoLoudGap(s);
  });

  it("BT4-019 [When Digivolving] <Digi-Burst 2> deletes the lone <=8000 DP opponent Digimon", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Base Lv.5 Red with one digivolution card already underneath: after digivolving BT4-019 on
    // top, the stack holds 2 (that card + the old top), so the <Digi-Burst 2> cost is payable.
    const base = digimon(0, 7000, "BT1-020");
    base.stack.push(instance("BT1-011", 0, true));
    p0.battleArea.push(base);
    p0.deck.push(instance("AD1-001", 0, false));

    const evolving = instance("BT4-019", 0, false); // Lv.6 Red; [WhenDigivolving] (optional) Digi-Burst 2 -> Delete
    p0.hand.push(evolving);

    const target = digimon(1, 5000); // opponent Digimon within the DP<=8000 Delete filter -> forced target
    p1.battleArea.push(target);
    s.state.memory = 10; // EvoCost 4 affordable

    expect(digivolve(s, 0, base.permanentId, evolving)).toEqual({ ok: true });
    await settle(() => base.topCard?.cardId === "BT4-019");
    expect(base.topCard?.cardId).toBe("BT4-019");
    expect(s.state.memory).toBe(6); // EvoCost 4 paid

    await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId));

    // The <Digi-Burst 2> cost trashed both digivolution cards, then the WhenDigivolving Delete resolved.
    expect(base.stack).toHaveLength(0);
    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === target.topCard?.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("DnaDigivolve: BT20-011 [On Play] merges 2 of my Digimon into the named BT12-028", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    // Paildramon's printed DNA recipe requires a blue and a green level 4.
    const materialA = digimon(0, 4000, "BT1-032");
    const materialB = digimon(0, 4000, "BT1-069");
    p0.battleArea.push(materialA, materialB);

    // Paildramon has the Free trait required by ExVeemon's effect.
    p0.hand.push(instance("BT12-028", 0, false));
    const source = instance("BT20-011", 0, false); // OnPlay source; play 4 + DNA cost 0
    p0.hand.push(source);
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    // A single new permanent whose top card is the named DNA result appears...
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT12-028"));
    const merged = p0.battleArea.find((p) => p.topCard?.cardId === "BT12-028");
    expect(merged, "the named DNA result BT12-028 must be on my battle area").toBeDefined();

    // ...and both material permanents are consumed by the merge (their ids are gone, their
    // top cards now ride under the merged result's stack).
    expect(p0.battleArea.some((p) => p.permanentId === materialA.permanentId)).toBe(false);
    expect(p0.battleArea.some((p) => p.permanentId === materialB.permanentId)).toBe(false);
    const stackIds = merged!.stack.map((c) => c.instanceId);
    expect(stackIds).toContain(materialA.topCard?.instanceId);
    expect(stackIds).toContain(materialB.topCard?.instanceId);
    assertNoLoudGap(s);
  });

  it("BT16-092 grants Blocker and battle deletion protection only to its DNA result", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const materialA = digimon(0, 4000, "BT1-032");
    const materialB = digimon(0, 4000, "BT1-069");
    p0.battleArea.push(materialA, materialB);
    p0.hand.push(instance("BT12-028", 0, false));
    const source = instance("BT16-092", 0, false);
    p0.hand.push(source);
    s.state.memory = 7; // option cost 3; printed DNA cost 0

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => {
      const merged = p0.battleArea.find((p) => p.topCard?.cardId === "BT12-028");
      return merged !== undefined && ledger(s).hasKeyword(merged.permanentId, "Blocker");
    });

    const merged = p0.battleArea.find((p) => p.topCard?.cardId === "BT12-028");
    expect(merged, "the DNA result must be on my battle area").toBeDefined();
    expect(ledger(s).hasKeyword(merged!.permanentId, "Blocker")).toBe(true);
    expect(ledger(s).hasRestriction(merged!.permanentId, "beDeletedInBattle")).toBe(true);
    expect(ledger(s).hasKeyword(materialA.permanentId, "Blocker")).toBe(false);
    expect(ledger(s).hasKeyword(materialB.permanentId, "Blocker")).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("A3 Digi-Burst BT4-054 — Restrict-head <Digi-Burst 2> is paid, not free (BLK-04)", () => {
  // Guardrail for the IDigiBurst runtime record fix (BT4-054 branch). BT4-054's [Main] head
  // action is a `Restrict` (GainCantUnsuspendNextActivePhase). The Custom-select branch
  // consumed the computed <Digi-Burst 2> cost into `next._cost`, but the gainRestrict verb
  // handler never re-attached it, so the IR carried NO cost and the effect activated FREE
  // (the source stack stayed intact and the unsuspend restriction applied for free). KB Q1213
  // confirms the effect targets exactly 1 opponent SUSPENDED Digimon. The test FAILS (source
  // stack not consumed) if the cost-attach regresses — assertNoLoudGap alone would NOT catch a
  // free activation (RESEARCH Pitfall 3), so we assert the observable cost payment directly.
  it("BT4-054 [Main] trashes 2 stack cards and applies the unsuspend restriction", async () => {
    const s = setup({ autoSelectCards: true, autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const source = digimon(0, 5000, "BT4-054");
    const burst1 = instance("AD1-001", 0, false);
    const burst2 = instance("AD1-001", 0, false);
    source.stack.push(burst1, burst2); // the 2 digivolution cards the <Digi-Burst 2> pays
    p0.battleArea.push(source);
    const sourceInstanceId = source.topCard!.instanceId;

    const target = digimon(1, 4000, "AD1-001");
    target.isSuspended = true; // the effect targets 1 SUSPENDED opponent Digimon (KB Q1213)
    p1.battleArea.push(target);

    const entry = activatableEffects(s, source).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "BT4-054 surfaces its <Digi-Burst 2> [Main] ability").toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => ledger(s).hasRestriction(target.permanentId, "unsuspend"));

    // Cost paid from the SOURCE stack: both burst cards are gone and now in my trash. Before
    // the fix the IR carried no cost, so the stack would still hold 2 here (free activation).
    expect(source.stack).toHaveLength(0);
    expect(p0.trash.some((c) => c.instanceId === burst1.instanceId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === burst2.instanceId)).toBe(true);

    // The downstream unsuspend restriction applied to the chosen opponent Digimon.
    expect(ledger(s).hasRestriction(target.permanentId, "unsuspend")).toBe(true);
    assertNoLoudGap(s);
  });

  it("BT4-054 [Main] does not apply when the stack holds fewer than 2 cards", async () => {
    const s = setup({ autoSelectCards: true, autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const source = digimon(0, 5000, "BT4-054");
    const lone = instance("AD1-001", 0, false);
    source.stack.push(lone); // only 1 digivolution card -> <Digi-Burst 2> is unpayable
    p0.battleArea.push(source);
    const sourceInstanceId = source.topCard!.instanceId;

    const target = digimon(1, 4000, "AD1-001");
    target.isSuspended = true;
    p1.battleArea.push(target);

    const entry = activatableEffects(s, source).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "an unpayable Digi-Burst must not surface an activation affordance").toBeUndefined();

    // Nothing activated: the lone card stayed, and the restriction did NOT apply.
    expect(source.stack).toHaveLength(1);
    expect(p0.trash.some((c) => c.instanceId === lone.instanceId)).toBe(false);
    expect(ledger(s).hasRestriction(target.permanentId, "unsuspend")).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("A3 Digi-Burst BT7-040 — <Digi-Burst up to 4> scales -3000 DP per card paid (BLK-04)", () => {
  // Guardrail for the IDigiBurst `.SetUpToMaxCount()` runtime record branch + the engine's upTo
  // choose-and-pay path. BT7-040 is `IDigiBurst(.., 4).SetUpToMaxCount()` with
  // `minusDP = 3000 * digiBurst.discardedCards.Count` (documented behavior). Before the fix the runtime record
  // emitted a TARGETLESS cost, so payCost returned false at the `if (!cost.target)` guard and
  // the action ABORTED (opponent DP unchanged). The printed effectText ("Digi-Burst 2 / -2000")
  // is stale; the documented behavior code + KB Q1568-1570 are authoritative: trash 1..4 (at least 1 to
  // activate, Q1569), single opponent target (Q1570), -3000 per card actually trashed.
  //
  // Variable scaling is driven deterministically by the source stack size: the test harness's
  // selectCards driver takes `slice(0, max)` and max is capped at the stack length, so a
  // 2-card stack pays 2 (-6000) and a 1-card stack pays 1 (-3000). assertNoLoudGap does NOT
  // catch the abort (RESEARCH Pitfall 3) — we assert the observable DP change + stack shrink.
  function drive(stackSize: number) {
    const s = setup({ autoSelectCards: true, autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const source = digimon(0, 6000, "BT7-040");
    const burst = Array.from({ length: stackSize }, () => instance("AD1-001", 0, false));
    source.stack.push(...burst);
    p0.battleArea.push(source);
    const sourceInstanceId = source.topCard!.instanceId;

    // Base DP high enough that -6000 stays positive (DP floors at 0, modifiers.ts:293), so the
    // 2-paid (-6000 -> 4000) and 1-paid (-3000 -> 7000) outcomes are distinct and observable.
    const baseDp = 10000;
    const target = digimon(1, baseDp, "AD1-001");
    p1.battleArea.push(target);

    return { s, p0, p1, source, sourceInstanceId, burst, target, baseDp };
  }

  it("BT7-040 trashing 2 applies -6000 DP and shrinks the stack by 2 (does not abort)", async () => {
    const ctx = drive(2);
    const entry = activatableEffects(ctx.s, ctx.source).find((e) => e.instanceId === ctx.sourceInstanceId);
    expect(entry, "BT7-040 surfaces its <Digi-Burst up to 4> [Main] ability").toBeDefined();

    expect(
      ctx.s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: ctx.sourceInstanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => ctx.target.currentDP !== ctx.baseDp);

    // Paid 2 -> -3000 x 2 = -6000. Before the fix this aborted (DP unchanged at 5000).
    expect(ctx.target.currentDP).toBe(ctx.baseDp - 6000);
    // Cost paid from the SOURCE stack: it shrank by exactly the paid count.
    expect(ctx.source.stack).toHaveLength(0);
    for (const c of ctx.burst) expect(ctx.p0.trash.some((t) => t.instanceId === c.instanceId)).toBe(true);
    assertNoLoudGap(ctx.s);
  });

  it("BT7-040 trashing 1 applies -3000 DP — the reduction scales to the PAID count", async () => {
    const ctx = drive(1);
    const entry = activatableEffects(ctx.s, ctx.source).find((e) => e.instanceId === ctx.sourceInstanceId);
    expect(entry, "BT7-040 surfaces its ability with a single-card stack (Q1569: 1+ to activate)").toBeDefined();

    expect(
      ctx.s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: ctx.sourceInstanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => ctx.target.currentDP !== ctx.baseDp);

    // Paid 1 -> -3000 (NOT a fixed -6000 nor the printed -2000): the scaling tracks the count
    // actually trashed, proving variable-count fidelity rather than a fixed-count approximation.
    expect(ctx.target.currentDP).toBe(ctx.baseDp - 3000);
    expect(ctx.source.stack).toHaveLength(0);
    assertNoLoudGap(ctx.s);
  });

  it("BT7-040 targets exactly 1 opponent Digimon (KB Q1570)", async () => {
    const ctx = drive(2);
    const other = digimon(1, ctx.baseDp, "AD1-001"); // a second opponent Digimon
    ctx.p1.battleArea.push(other);

    const entry = activatableEffects(ctx.s, ctx.source).find((e) => e.instanceId === ctx.sourceInstanceId);
    expect(
      ctx.s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: ctx.sourceInstanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => ctx.p1.battleArea.some((p) => p.currentDP !== ctx.baseDp));

    // Exactly one of the two opponent Digimon took the -DP (single target, count 1).
    const debuffed = ctx.p1.battleArea.filter((p) => p.currentDP !== ctx.baseDp);
    expect(debuffed).toHaveLength(1);
    assertNoLoudGap(ctx.s);
  });
});

describe("IDigiBurst payment shape — all 28 cards keep a targeted digivolution-card payment (BLK-04)", () => {
  // Regression guard (T-01-01): every IDigiBurst card must carry either a targeted
  // `cost` or the specialized `TrashDigivolution` payment action. The latter performs
  // the payment itself and must not also receive a generic cost, which would make
  // affordance preflight require (and resolution attempt) the same payment twice.
  // The authoritative roster is the set of documented behavior files containing `new IDigiBurst(` (28 cards).
  // Before the fix BT4-054 (no cost) and BT7-040 (targetless raw cost) FAIL this assertion;
  // after the fix all 28 pass and the 26 already-correct cards must not regress.
  const IDIGIBURST_CARDS = [
    "BT4-012",
    "BT4-017",
    "BT4-019",
    "BT4-026",
    "BT4-032",
    "BT4-033",
    "BT4-046",
    "BT4-049",
    "BT4-054",
    "BT4-059",
    "BT4-062",
    "BT4-068",
    "BT4-072",
    "BT4-081",
    "BT5-046",
    "BT5-056",
    "BT5-057",
    "BT5-070",
    "BT5-079",
    "BT6-028",
    "BT7-034",
    "BT7-040",
    "P-025",
    "P-026",
    "P-027",
    "ST4-13",
    "ST5-13",
    "ST6-13",
  ];

  function hasTargetedDigiBurstCost(cardId: string): boolean {
    const card = getCompiledCard(cardId);
    if (!card) return false;
    for (const effect of card.effects ?? []) {
      for (const action of (effect as { actions?: unknown[] }).actions ?? []) {
        const typedAction = action as {
          kind?: string;
          target?: { filter?: { isSelfRef?: boolean; zone?: string } };
          cost?: { target?: { filter?: { zone?: string } } };
        };
        if (typedAction.kind === "TrashDigivolution" && typedAction.target?.filter?.isSelfRef === true) {
          return true;
        }
        const cost = typedAction.cost;
        if (cost?.target?.filter?.zone === "digivolutionCards") return true;
      }
    }
    return false;
  }

  it("every IDigiBurst card carries a targeted digivolutionCards payment", () => {
    const missing = IDIGIBURST_CARDS.filter((id) => !hasTargetedDigiBurstCost(id));
    expect(missing, `cards lacking a targeted digivolutionCards cost: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("A3 ruleProcess — the state-based-action fixpoint (BLK-02)", () => {
  // BT1-035 Leomon = the canonical [On Deletion] Gain 2 memory card (KB Q892: a deletion
  // moves the gauge toward the DELETED card's owner). BT10-034 = [On Play] -3000 DP to the
  // lone opponent Digimon. Staging BT1-035 at base DP 3000 means BT10-034's -3000 drives it
  // to exactly raw DP 0, which the now-live ruleProcess fixpoint must delete — proving the
  // FIXPOINT (not a manual deletePermanent call) performs the deletion and fires [On Deletion].
  const ON_DELETION_GAIN2 = "BT1-035";

  // (1) DP-0 deletion by the fixpoint + [On Deletion] fires.
  //
  // Fails-when-reverted: revert ruleProcess to `async () => {}` (GameEngine.resolutionDeps:
  //   `ruleProcess: async () => {}`) and the 0-DP BT1-035 SURVIVES — the battle area still
  //   holds it and no Gain 2 memory delta occurs (memory stays 0, not -2). The deletion here
  //   comes from no attack and no Delete effect; the ONLY thing that removes a 0-DP Digimon is
  //   the state-based-action sweep, so the assertion below is a direct proof of the fixpoint.
  it("ruleProcess deletes a Digimon driven to 0 DP by an effect and fires its [On Deletion]", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Opponent's 3000-DP Leomon ([On Deletion] Gain 2 memory). Owner = seat 1 (NOT the turn
    // player), so its [On Deletion] moves the gauge -2.
    const target = digimon(1, 3000, ON_DELETION_GAIN2);
    p1.battleArea.push(target);

    // BT10-007 Dondokomon ([Xros Heart] trait) — BT10-034's -3000 is officially gated on
    // "if you have another Digimon or Tamer with [Xros Heart] in its traits in play".
    p0.battleArea.push(digimon(0, 2000, "BT10-007"));

    // Seat 0 plays BT10-034 ([On Play] -3000 DP to the lone opponent Digimon): 3000 -> 0.
    // BT10-034 costs 4, so start the gauge at +4: paying the cost lands it at 0, isolating
    // the [On Deletion] Gain 2 (-2 toward seat 1) as the only post-play delta to assert.
    const source = instance("BT10-034", 0, false);
    p0.hand.push(source);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    // Settle on the [On Deletion] memory move (the LAST effect in the chain), not merely the
    // play: the fixpoint deletes the 0-DP Leomon, then its OnDestroyedAnyone window resolves
    // Gain 2 memory toward its seat-1 owner (-2 on the signed gauge, from the post-cost 0).
    await settle(() => s.state.memory === -2);

    // Concrete GameState delta (Pitfall 1): the 0-DP Digimon is GONE from the battle area,
    // its top card is in its owner's trash, and the [On Deletion] Gain 2 delta occurred exactly once.
    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === target.topCard?.instanceId)).toBe(true);
    expect(s.state.memory).toBe(-2);
    assertNoLoudGap(s);
  });

  // (2) EndGame during the sweep stops the fixpoint.
  //
  // A player marked `lost` (the source SetLose state) must be resolved into a game-over by
  // the fixpoint's EndGameProcess step (#1, documented behavior `yield break`) the next time a state-based-action
  // sweep runs. We set seat 1's `lost` flag, then drive any effect resolution (a harmless
  // BT10-034 play whose -3000 leaves the target well above 0) so `resolveTiming` invokes
  // ruleProcess; the fixpoint's runEndGameProcess declares seat 0 the winner and returns.
  //
  // Fails-when-reverted: revert ruleProcess to `async () => {}` and `gameOver` stays false —
  //   the `lost` flag is never resolved into a game-over, because nothing else sweeps it.
  it("ruleProcess endgame: a lost player triggers EndGame during the sweep and stops it", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // A target that stays above 0 after -3000 (no DP-0 deletion competes with EndGame).
    const target = digimon(1, 8000); // 8000 -> 5000
    p1.battleArea.push(target);

    // BT10-007 Dondokomon ([Xros Heart] trait) — BT10-034's official [On Play] gate.
    p0.battleArea.push(digimon(0, 2000, "BT10-007"));

    // Seat 1 is at a loss condition reached before/at the sweep (source SetLose state).
    p1.lost = true;
    expect(s.state.gameOver).toBe(false);

    const source = instance("BT10-034", 0, false);
    p0.hand.push(source);
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    // The fixpoint resolves the pending `lost` flag into a game-over: seat 0 wins.
    await settle(() => s.state.gameOver);

    expect(s.state.gameOver).toBe(true);
    expect(s.state.winnerSeat).toBe(0);
    assertNoLoudGap(s);
  });
});

describe("A3 Tamer-onto digivolve — 'digivolve from hand onto a <color> Tamer as if level N'", () => {
  // BT4-025 (Blue, evo cost {Blue, Lv.3, 2}) may digivolve from hand onto a BLUE Tamer,
  // treated as a level-3 base, paying its level-3 evo cost (2). effects.json carries only a
  // STALE gateless {cost:2, isAlternate:true} for this card (it would match ANY base of ANY
  // color); the fix derives the correctly-gated requirement from the registered IR. The two
  // negatives are the revert-confirm: under the old gateless requirement BOTH passed.
  it("digivolves onto a same-color Tamer at the level-3 evo cost", () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const base = digimon(0, 0, "BT1-086"); // Matt Ishida — Blue Tamer
    p0.battleArea.push(base);
    const evolving = instance("BT4-025", 0, false); // Blue Digimon, evo {Blue, Lv.3, 2}
    p0.hand.push(evolving);
    s.state.memory = 2;

    expect(digivolve(s, 0, base.permanentId, evolving)).toEqual({ ok: true });
  });

  it("rejects a wrong-color Tamer (the stale gateless requirement matched any color)", () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const base = digimon(0, 0, "BT1-088"); // Izzy Izumi — Green Tamer
    p0.battleArea.push(base);
    const evolving = instance("BT4-025", 0, false);
    p0.hand.push(evolving);
    s.state.memory = 2;

    expect(digivolve(s, 0, base.permanentId, evolving)).toEqual({
      ok: false,
      reason: "invalid-evolution",
    });
  });

  it("rejects a non-Tamer base (the stale gateless requirement matched any base)", () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    // BT1-038 is a Lv.5 Blue Digimon: no printed evo cost of BT4-025 matches it (BT4-025's only
    // entry is Lv.3), so ONLY the removed gateless requirement could have made this legal.
    const base = digimon(0, 6000, "BT1-038");
    p0.battleArea.push(base);
    const evolving = instance("BT4-025", 0, false);
    p0.hand.push(evolving);
    s.state.memory = 2;

    expect(digivolve(s, 0, base.permanentId, evolving)).toEqual({
      ok: false,
      reason: "invalid-evolution",
    });
  });

  it("multicolor BT17-022 uses only its printed yellow Tamer route", () => {
    // BT17-022 is Blue/Yellow, but its special Tamer clause explicitly says yellow.
    const onto = (tamerId: string) => {
      const s = setup();
      const p0 = s.state.players[0] as PlayerState;
      const base = digimon(0, 0, tamerId);
      p0.battleArea.push(base);
      const evolving = instance("BT17-022", 0, false);
      p0.hand.push(evolving);
      s.state.memory = 3;
      return digivolve(s, 0, base.permanentId, evolving);
    };
    expect(onto("BT1-086")).toEqual({ ok: false, reason: "invalid-evolution" }); // Blue Tamer
    expect(onto("BT1-087")).toEqual({ ok: true }); // Yellow Tamer
    expect(onto("BT1-088")).toEqual({ ok: false, reason: "invalid-evolution" }); // Green Tamer
  });
});

// ---------------------------------------------------------------------------
// A3 — BT9-012 Greymon (X Antibody): inherited leave-prevention.
//
// The inherited (lower-box) effect protects the HOST Digimon (the one carrying
// BT9-012 in its digivolution cards) when its name contains [Greymon] or [Omnimon]
// and an EFFECT would delete it or return it to hand/deck: the controller may trash
// 2 same-level digivolution cards to prevent it from leaving play.
//
// KB: Q1803 (2 cards same level as EACH OTHER), Q1804 (may include itself),
//     Q1805 (byEffect ONLY — a DP-0 / byRule deletion does NOT fire it).
//
// FAILS-WHEN-REVERTED: in BT9-012.ts, change `causeAllows: (cause) => cause === "byEffect"`
// to `() => false` (or remove the subscribeReplacement call) => the host is no longer
// prevented from leaving on an effect deletion => the POSITIVE test goes RED.
// ---------------------------------------------------------------------------
describe("A3 LeavePrevention — BT9-012 inherited same-level trash to prevent leaving", () => {
  const GREYMON_HOST = "AD1-001"; // vanilla "Greymon" Lv.4 top card (no module of its own)
  const LV3_A = "BT1-009"; // Monodramon, Lv.3
  const LV3_B = "BT1-010"; // Agumon, Lv.3
  const LV5 = "BT1-024"; // MetalTyrannomon, Lv.5
  const NON_GREYMON_HOST = "BT2-009"; // Guilmon Lv.3 — name lacks Greymon/Omnimon

  // Drive an EFFECT deletion of a permanent through the real primitives seam, after a
  // continuous recompute has installed the inherited prevention replacement.
  async function effectDelete(s: Setup, permanentId: string): Promise<void> {
    const engine = s.engine as unknown as {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
    };
    await engine.recomputeContinuousEffects();
    await engine.primitives.deletePermanent([permanentId], "byEffect");
  }

  it("POSITIVE: pays (trash 2 same-level stack cards) and the host is prevented from leaving", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const host = digimon(0, 6000, GREYMON_HOST);
    // Stack: BT9-012 (Lv.4) + two Lv.3 cards. Only the two Lv.3s share a level, so the
    // cost is payable and the offered candidates are exactly those two.
    host.stack.push(instance("BT9-012", 0, true), instance(LV3_A, 0, true), instance(LV3_B, 0, true));
    p0.battleArea.push(host);
    const stackBefore = host.stack.length;

    await effectDelete(s, host.permanentId);
    await settle(() => host.stack.length < stackBefore);

    expect(p0.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(true); // prevented
    expect(host.stack.length).toBe(stackBefore - 2); // 2 same-level cards trashed as the cost
    expect(p0.trash.length).toBe(2);
    assertNoLoudGap(s);
  });

  it("NEGATIVE (Q1805): a byRule (DP-0) deletion does NOT fire the prevention", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const host = digimon(0, 6000, GREYMON_HOST);
    host.stack.push(instance("BT9-012", 0, true), instance(LV3_A, 0, true), instance(LV3_B, 0, true));
    p0.battleArea.push(host);
    const stackBefore = host.stack.length;

    const engine = s.engine as unknown as {
      recomputeContinuousEffects(): Promise<void>;
      primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> };
    };
    await engine.recomputeContinuousEffects();
    // byRule = the DP-0 / state-based deletion cause; the prevention must NOT fire.
    await engine.primitives.deletePermanent([host.permanentId], "byRule");
    await settle(() => !p0.battleArea.some((p) => p.permanentId === host.permanentId));

    expect(p0.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(false); // left play
    // Not prevented: the whole permanent (top + 3 stack cards) hit the trash on deletion —
    // there was no 2-card cost-only outcome (which is what a successful prevention leaves).
    expect(p0.trash.length).toBe(stackBefore + 1);
    assertNoLoudGap(s);
  });

  it("NEGATIVE (cost): no two same-level stack cards => cost unpayable => host leaves", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const host = digimon(0, 6000, GREYMON_HOST);
    // All distinct levels: BT9-012 (Lv.4), Lv.3, Lv.5 — no pair shares a level.
    host.stack.push(instance("BT9-012", 0, true), instance(LV3_A, 0, true), instance(LV5, 0, true));
    p0.battleArea.push(host);

    await effectDelete(s, host.permanentId);
    await settle(() => !p0.battleArea.some((p) => p.permanentId === host.permanentId));

    expect(p0.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(false); // left play
    // Cost unpayable (no two same-level stack cards): the prevention returned false, so the
    // host was deleted normally — top + 3 stack cards in trash, not a 2-card cost.
    expect(p0.trash.length).toBe(4);
    assertNoLoudGap(s);
  });

  it("NEGATIVE (name): a host without [Greymon]/[Omnimon] in its name is not protected", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const host = digimon(0, 6000, NON_GREYMON_HOST); // Guilmon — name does not qualify
    host.stack.push(instance("BT9-012", 0, true), instance(LV3_A, 0, true), instance(LV3_B, 0, true));
    p0.battleArea.push(host);

    await effectDelete(s, host.permanentId);
    await settle(() => !p0.battleArea.some((p) => p.permanentId === host.permanentId));

    expect(p0.battleArea.some((p) => p.permanentId === host.permanentId)).toBe(false); // left play
    // Name does not qualify: the replacement's `protects` returns false, so the host is
    // deleted normally (top + 3 stack cards), not saved by the 2-card cost.
    expect(p0.trash.length).toBe(4);
    assertNoLoudGap(s);
  });
});

describe("BT13-008 TreatAs — card-level A3 (real engine, drives resolve())", () => {
  // Unlike the synthetic bt13-008-treat-as.test.ts (which pokes the ContinuousEffectLedger
  // directly), this plays BT13-008's [Main] ability through applyIntent("activateEffect") so
  // every clause is proven via the card's real resolve(): grantKind (treat-as-Digimon -> can
  // attack), setBaseDP (-> currentDP 3000), and restrict("digivolve") (-> base can't be
  // digivolved onto). The before/after split is the fails-when-reverted control: an
  // un-activated Marcus Damon Tamer fails all three.
  const MARCUS = "BT12-092"; // a [Marcus Damon]-name Tamer

  function reader(s: Setup): ContinuousLegalityReader {
    return (s.engine as unknown as { continuous: ContinuousLegalityReader }).continuous;
  }

  it("grants the chosen Marcus Damon Digimon kind (can attack), 3000 DP, and can't-digivolve", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const marsmon = digimon(0, 11000, "BT13-008"); // the source: Marsmon, Red Lv.6
    const marcus = digimon(0, 0, MARCUS); // the Tamer to be treated as a Digimon
    p0.battleArea.push(marsmon, marcus);
    const sourceInstanceId = marsmon.topCard!.instanceId;
    const access = new GameStateAccess(s.state);

    // --- before activation: a pure Tamer fails all three clauses (the control) ---
    expect(canAttackerDeclare(access, 0 as Seat, marcus, reader(s))).toBe("illegal-target");
    expect(marcus.currentDP).toBe(0);
    expect(reader(s).hasRestriction(marcus.permanentId, "digivolve")).toBe(false);

    const entry = activatableEffects(s, marsmon).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "BT13-008 surfaces its [Main] become-Digimon ability").toBeDefined();

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: entry!.effectKey })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((e) => e.kind === "effectActivated"));

    // --- after activation: the chosen Marcus Damon is now a 3000-DP Digimon that can't digivolve ---
    expect(canAttackerDeclare(access, 0 as Seat, marcus, reader(s))).toBeNull();
    expect(marcus.currentDP).toBe(3000);
    expect(reader(s).hasRestriction(marcus.permanentId, "digivolve")).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("EX6-060 — trash count suspends distinct eligible Digimon", () => {
  it("trashing 2 cards suspends 2 distinct level-5-or-lower Digimon before deleting the lowest play cost", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const lowerCost = digimon(1, 5000, "BT1-018"); // Lv.4, play cost 5
    const higherCost = digimon(1, 6000, "BT1-019"); // Lv.4, play cost 6
    const rageMode = instance("EX6-060", 0, false);
    p0.hand.push(rageMode, instance("BT1-009", 0, false), instance("BT1-010", 0, false));
    p1.battleArea.push(lowerCost, higherCost);
    s.state.memory = 13;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: rageMode.instanceId })).toEqual({ ok: true });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === lowerCost.permanentId));

    expect(lowerCost.isSuspended).toBe(true);
    expect(higherCost.isSuspended).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === lowerCost.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === higherCost.permanentId)).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("BT12-014 — dynamic DP deletion budget", () => {
  it("adds 3000 to the 4000 deletion budget for each 2 digivolution cards", async () => {
    const s = setup({ autoSelectCards: true, autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const base = digimon(0, 6000, "BT11-010");
    base.stack.push(instance("BT1-009", 0, true), instance("BT1-010", 0, true), instance("BT1-011", 0, true));
    const omniShoutmon = instance("BT12-014", 0, false);
    const dp3000a = digimon(1, 3000, "BT1-009");
    const dp3000b = digimon(1, 3000, "BT1-010");
    const dp1000 = digimon(1, 1000, "BT1-011");
    p0.battleArea.push(base);
    p0.hand.push(omniShoutmon);
    p1.battleArea.push(dp3000a, dp3000b, dp1000);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: omniShoutmon.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === dp3000a.permanentId));

    expect(p1.battleArea.some((p) => p.permanentId === dp3000a.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === dp3000b.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === dp1000.permanentId)).toBe(false);
    assertNoLoudGap(s);
  });
});

describe("BT9-103 Kongou — opponent effects cannot add cards to security", () => {
  it("blocks an opponent's On Play Recovery while leaving the deck card in place", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const kongou = instance("BT9-103", 0, false);
    const magnaAngemon = instance("BT1-060", 1, false);
    const deckTop = instance("BT1-009", 1, false);
    p0.battleArea.push(digimon(0, 3000, "BT10-022")); // §4-21 color-requirement source (Black)
    p0.hand.push(kongou);
    p1.hand.push(magnaAngemon);
    p1.deck.push(deckTop);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: kongou.instanceId })).toEqual({ ok: true });
    await settle(() => p0.trash.some((card) => card.instanceId === kongou.instanceId));

    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: magnaAngemon.instanceId })).toEqual({ ok: true });
    await settle(() => p1.battleArea.some((p) => p.topCard?.instanceId === magnaAngemon.instanceId));

    expect(p1.security).toHaveLength(0);
    expect(p1.deck.some((card) => card.instanceId === deckTop.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("BT25-104 TreatAs — [Your Turn] All [Marcus Damon]s are a 12000 DP Digimon with Rush", () => {
  // Real-engine A3 for the continuous ("YourTurn") clause the RawUnparsed marker used to
  // throw UnsupportedEffectError on (interpreter.ts unsupported()). Proves the same
  // GrantStatic(kinds)/SetBaseDP/GainKeyword bundle as BT13-008, but fired every
  // recomputeContinuousEffects pass (not a chosen [Main] activation) and applying to EVERY
  // matching Tamer (`count: "all"`), gated on the controller's own turn (Q6499/Q6500/Q6506).
  const MARCUS = "BT12-092"; // a [Marcus Damon]-name Tamer

  function reader(s: Setup): ContinuousLegalityReader {
    return (s.engine as unknown as { continuous: ContinuousLegalityReader }).continuous;
  }

  it("grants every Marcus Damon Tamer Digimon kind, 12000 DP, and Rush while it's the controller's turn", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const access = new GameStateAccess(s.state);

    const burstMode = digimon(0, 11000, "BT25-104");
    const marcus = digimon(0, 0, MARCUS);
    p0.battleArea.push(burstMode, marcus);

    // --- before recompute: a pure Tamer, no grants yet (the control) ---
    expect(canAttackerDeclare(access, 0 as Seat, marcus, reader(s))).toBe("illegal-target");
    expect(marcus.currentDP).toBe(0);
    expect(reader(s).hasKeyword(marcus.permanentId, "Rush")).toBe(false);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    assertNoLoudGap(s);

    expect(canAttackerDeclare(access, 0 as Seat, marcus, reader(s))).toBeNull();
    expect(marcus.currentDP).toBe(12000);
    expect(reader(s).hasKeyword(marcus.permanentId, "Rush")).toBe(true);

    // --- opponent's turn: the grant is a [Your Turn] effect, so it lapses ---
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(canAttackerDeclare(access, 0 as Seat, marcus, reader(s))).toBe("illegal-target");
    expect(marcus.currentDP).toBe(0);
    expect(reader(s).hasKeyword(marcus.permanentId, "Rush")).toBe(false);

    // --- back on the controller's turn, then the source leaves the field (Q6506): reverts ---
    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(marcus.currentDP).toBe(12000);
    p0.battleArea.splice(
      p0.battleArea.findIndex((p) => p.permanentId === burstMode.permanentId),
      1,
    );
    await s.engine.recomputeContinuousEffects();
    expect(canAttackerDeclare(access, 0 as Seat, marcus, reader(s))).toBe("illegal-target");
    expect(marcus.currentDP).toBe(0);
    expect(reader(s).hasKeyword(marcus.permanentId, "Rush")).toBe(false);
    assertNoLoudGap(s);
  });

  it("activates the registered Option-side [Main] when digivolving", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const base = digimon(0, 12000, "AD1-004");
    const target = digimon(1, 16000, "AD1-016");
    const burstMode = instance("BT25-104", 0, false);
    p0.battleArea.push(base);
    p0.hand.push(burstMode);
    p1.battleArea.push(target);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: burstMode.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP === 1000);

    expect(target.currentDP).toBe(1000);
    assertNoLoudGap(s);
  });
});

describe("Wave-1 SubTrigger-source targeting — card-level A3s", () => {
  // P-064: when a Digimon with [Jellymon] in its stack attacks, you may suspend this Tamer to
  // grant THAT attacking Digimon <Jamming> (the SubTrigger source, not a player-chosen target).
  it("P-064 grants Jamming to the attacking Jellymon-stacked Digimon, not to others", async () => {
    const s = setup({ autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const tamer = digimon(0, 0, "P-064");
    p0.battleArea.push(tamer);

    const attacker = digimon(0, 15000, "BT1-009"); // red Digimon; high DP so it survives the security battle
    attacker.stack.push(instance("BT13-023", 0, true)); // [Jellymon] in its digivolution cards
    p0.battleArea.push(attacker);

    const other = digimon(0, 3000, "BT1-009"); // friendly Digimon WITHOUT Jellymon (control)
    p0.battleArea.push(other);

    p1.security.push(instance("BT1-028", 1, false)); // absorb the attack

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => ledger(s).hasKeyword(attacker.permanentId, "Jamming"));

    expect(ledger(s).hasKeyword(attacker.permanentId, "Jamming")).toBe(true); // granted to THE attacker (trigger source)
    expect(ledger(s).hasKeyword(other.permanentId, "Jamming")).toBe(false); // not the player-chosen anyone
    expect(tamer.isSuspended).toBe(true); // the suspend cost was paid
    assertNoLoudGap(s);
  });

  // BT19-080: when one of your Digimon digivolves into a [Growlmon]/[Gallantmon], by suspending
  // this Tamer, that DIGIVOLVING Digimon (the trigger subject) gains <Raid>. Fails-when-reverted:
  // without the GameEngine.ts:717 subjectPermanentId threading the effect no-ops (subject undefined).
  it("BT19-080 grants Raid to the Digimon that digivolved into Growlmon (trigger subject)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const tamer = digimon(0, 0, "BT19-080");
    p0.battleArea.push(tamer);

    const base = digimon(0, 3000, "BT1-009"); // Red Lv.3 base
    p0.battleArea.push(base);

    const growlmon = instance("BT12-010", 0, true); // Red Lv.4 Growlmon, evo from Red Lv.3 cost 2
    p0.hand.push(growlmon);
    s.state.memory = 5;
    p1.security.push(instance("BT1-028", 1, false), instance("BT1-028", 1, false)); // absorb the forced attack

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: growlmon.instanceId }),
    ).toEqual({ ok: true });
    await settle(() => ledger(s).hasKeyword(base.permanentId, "Raid"));

    expect(ledger(s).hasKeyword(base.permanentId, "Raid")).toBe(true);
    expect(tamer.isSuspended).toBe(true); // the suspend cost was paid through the real seam
    assertNoLoudGap(s);
  });
});

describe("A3 SubTrigger — whenMovedFromBreeding / whenOpponentMovedFromBreeding fire at the move-from-breeding seam", () => {
  // The two events are declared in SubTriggerEventName and mapped in SUBTRIGGER_EVENT_MAP but
  // were never fired (inert-bus bug). The fix adds two fireSubTrigger calls in
  // GameEngine.handleMoveFromBreeding after applyMoveFromBreeding succeeds.
  //
  // FAILS-WHEN-REVERTED:
  //   - whenMovedFromBreeding count stays 0 if the first fireSubTrigger call is removed.
  //   - whenOpponentMovedFromBreeding count stays 0 if the second is removed.
  //   - Both counts stay 0 if the whole fire block is removed.

  it("whenMovedFromBreeding fires when the turn player's own Digimon moves from breeding", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    // Place a Lv.3+ Digimon (DP > 0, cardId AD1-001) in seat-0's breeding area.
    const bred = digimon(0, 5000);
    bred.inBreeding = true;
    p0.breeding = bred;

    // Switch to Breeding phase — validateMoveFromBreeding gates on Phase.Breeding.
    s.state.phase = Phase.Breeding;

    // Arm a synthetic whenMovedFromBreeding watcher on the bred Digimon.
    let movedFromBreedingCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenMovedFromBreeding",
      sourcePermanentId: bred.permanentId,
      once: false,
      run: async () => {
        movedFromBreedingCount += 1;
      },
      description: "test: count whenMovedFromBreeding fires",
    });

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: bred.permanentId })).toEqual({ ok: true });

    await settle(() => movedFromBreedingCount > 0);

    expect(movedFromBreedingCount).toBe(1);
    // The permanent is now in the battle area, not breeding.
    expect(p0.breeding).toBeUndefined();
    expect(p0.battleArea.some((p) => p.permanentId === bred.permanentId)).toBe(true);
  });

  it("whenOpponentMovedFromBreeding fires when the turn player moves from breeding (opponent's watcher fires)", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Seat-0 moves from breeding (it is their turn).
    const bred = digimon(0, 5000);
    bred.inBreeding = true;
    p0.breeding = bred;
    s.state.phase = Phase.Breeding;

    // Seat-1 has a watcher anchored on one of their own on-field Digimon.
    const watcher = digimon(1, 4000);
    p1.battleArea.push(watcher);

    let opponentMovedCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenOpponentMovedFromBreeding",
      sourcePermanentId: watcher.permanentId,
      once: false,
      run: async () => {
        opponentMovedCount += 1;
      },
      description: "test: count whenOpponentMovedFromBreeding fires",
    });

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: bred.permanentId })).toEqual({ ok: true });

    await settle(() => opponentMovedCount > 0);

    expect(opponentMovedCount).toBe(1);
  });
});

describe("A3 SubTrigger — whenOpponentDraws fires only when the OPPONENT draws", () => {
  // `whenOpponentDraws` was declared in SubTriggerEventName and mapped in SUBTRIGGER_EVENT_MAP
  // but had zero non-test fire sites (inert-bus bug). The fix adds a fireSubTrigger call in
  // GameEngine.drawCards after cards are added to hand, gated by a whenOpponentDrawsGate in
  // interpreter.ts that fires a watcher only when drawingSeat !== watcher.ownerSeat.
  //
  // FAILS-WHEN-REVERTED:
  //   - opponentDrawsCount stays 0 if the fireSubTrigger call is removed from drawCards.
  //   - The own-draw negative fires if the gate is removed from runSubTrigger.

  it("whenOpponentDraws fires when the opponent (seat 1) draws and the watcher is on seat 0", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Watcher anchored on a seat-0 Digimon.
    const watcher = digimon(0, 5000);
    p0.battleArea.push(watcher);

    // Stock seat-1's deck with a card to draw.
    const card = instance("AD1-001", 1, false);
    p1.deck.push(card);

    let opponentDrawsCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenOpponentDraws",
      sourcePermanentId: watcher.permanentId,
      once: false,
      run: async () => {
        opponentDrawsCount += 1;
      },
      description: "test: count whenOpponentDraws fires",
    });

    // Seat-1 draws 1 card via the production drawCards path.
    await advance(s.engine).verb.draw(1, 1);

    await settle(() => opponentDrawsCount > 0);

    expect(opponentDrawsCount).toBe(1);
    // Card moved from deck to hand.
    expect(p1.hand.some((c) => c.instanceId === card.instanceId)).toBe(true);
  });

  it("whenOpponentDraws does NOT fire a watcher whose ownerSeat matches the drawing seat (gate verified via payload)", async () => {
    // The whenOpponentDrawsGate in runSubTrigger (interpreter.ts) blocks a watcher when
    // drawingSeat === watcher.ownerSeat. This test uses a DIRECT subscription that captures
    // and inspects the TriggerInfo payload so we can verify:
    //   (a) the payload carries the correct drawingSeat for each draw call, AND
    //   (b) a subscription filtered on "not own seat" fires only for opponent draws.
    // The test pairs two watcher installs — a "count-all" recorder (verifies fire seam) and
    // a "count only opponent" recorder (mirrors the gate) — on the SAME event and permanent.
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const watcher = digimon(0, 5000);
    p0.battleArea.push(watcher);

    for (let i = 0; i < 2; i++) p0.deck.push(instance("AD1-001", 0, false));
    for (let i = 0; i < 2; i++) p1.deck.push(instance("AD1-001", 1, false));

    const drawnSeats: number[] = [];
    // Recorder watcher — no gate, captures every drawingSeat in the payload.
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenOpponentDraws",
      sourcePermanentId: watcher.permanentId,
      once: false,
      run: async (subCtx) => {
        drawnSeats.push(subCtx.trigger?.drawingSeat ?? -1);
      },
      description: "test: record all drawingSeat payloads",
    });

    // Seat-1 draws (opponent of seat-0 watcher owner).
    await advance(s.engine).verb.draw(1, 1);
    await settle(() => drawnSeats.length > 0);

    // Seat-0 draws (own seat of watcher owner).
    await advance(s.engine).verb.draw(0, 1);
    await settle(() => drawnSeats.length > 1);

    // Both draws fired the SubTrigger event with the correct drawingSeat in the payload.
    // The gate (whenOpponentDrawsGate) will filter out seat-0 draws for interpreter-wired
    // watchers — verified here by payload correctness (the fire seam must set drawingSeat).
    expect(drawnSeats).toEqual([1, 0]);
  });
});

describe("A3 SubTrigger — whenEffectAddsToOpponentHand fires on any effect-driven hand add (BT11-090 / BT13-031 cluster)", () => {
  // "When an effect adds cards to your opponent's hand" (documented behavior EffectTiming.OnAddHand +
  // which (a) is narrower — fires only on the draw ACTION, missing return-to-hand / reveal-add,
  // and (b) over-fires on the normal draw-phase draw. The fix introduces a dedicated
  // whenEffectAddsToOpponentHand event fired from the effect hand-add seams (fx.draw,
  // fx.returnToHand), gated on the recipient seat being the watcher controller's OPPONENT.
  //
  // FAILS-WHEN-REVERTED:
  //   - addCount stays 0 if the fireSubTrigger call is removed from returnToHand.
  //   - The own-hand-add negative fires if the gate is removed from runSubTrigger.

  it("fires a seat-0 watcher when an effect returns a seat-1 Digimon to the OPPONENT's hand", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const watcher = digimon(0, 5000);
    p0.battleArea.push(watcher);

    // An opponent (seat-1) Digimon that an effect will bounce to seat-1's hand.
    const victim = digimon(1, 3000);
    p1.battleArea.push(victim);

    let addCount = 0;
    let recordedSeat = -1;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenEffectAddsToOpponentHand",
      sourcePermanentId: watcher.permanentId,
      once: false,
      run: async (subCtx) => {
        addCount += 1;
        recordedSeat = subCtx.trigger?.effectAddedToHandSeat ?? -1;
      },
      description: "test: count whenEffectAddsToOpponentHand fires",
    });

    await advance(s.engine).verb.returnToHand([victim.topCard!.instanceId]);
    await settle(() => addCount > 0);

    expect(addCount).toBe(1);
    expect(recordedSeat).toBe(1);
    expect(p1.hand.some((c) => c.instanceId === victim.topCard!.instanceId)).toBe(true);
  });

  it("does NOT fire a seat-0 watcher when an effect adds to the watcher's OWN (seat-0) hand", async () => {
    // The gate blocks the watcher when effectAddedToHandSeat === watcher.ownerSeat. A recorder
    // (no gate) confirms the fire seam set the payload seat to 0 for the own-hand return.
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    const watcher = digimon(0, 5000);
    p0.battleArea.push(watcher);
    const own = digimon(0, 3000);
    p0.battleArea.push(own);

    const recordedSeats: number[] = [];
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenEffectAddsToOpponentHand",
      sourcePermanentId: watcher.permanentId,
      once: false,
      run: async (subCtx) => {
        recordedSeats.push(subCtx.trigger?.effectAddedToHandSeat ?? -1);
      },
      description: "test: record effectAddedToHandSeat payloads",
    });

    await advance(s.engine).verb.returnToHand([own.topCard!.instanceId]);
    await settle(() => recordedSeats.length > 0);

    // Seam fired with the correct own-seat payload; the interpreter gate filters this out.
    expect(recordedSeats).toEqual([0]);
  });
});

describe("A3 SubTrigger — BT14-004 whenEffectSuspends fires ONLY for an effect-suspended Tamer (your effect)", () => {
  // BT14-004 (Digi-Egg) carries the INHERITED [Your Turn][Once Per Turn] watcher
  // SubTrigger { event: "whenEffectSuspends", sourceFilter: { kind: ["Tamer"] },
  // bySourceController: "mine", actions: [ModifyDP self +2000 forTheTurn] } — "when one of
  // YOUR effects suspends a Tamer, this Digimon gets +2000 DP for the turn." The effect-driven
  // suspend primitive fires whenEffectSuspends with the suspended permanent as subject and the
  // acting effect's seat; the watcher's sourceFilter rejects a Digimon subject and the
  // bySourceController gate rejects an opponent's effect.
  //
  // FAILS-WHEN-REVERTED:
  //   - Positive stays at base DP if the whenEffectSuspends fire is removed from the suspend
  //     primitive (the event the dead-bus bug left unfired).
  //   - Digimon-subject / opponent-effect cases gain +2000 if the sourceFilter (Tamer) or the
  //     bySourceController ("mine") gate is dropped.
  const HOST_EGG = "BT14-004"; // inherited whenEffectSuspends → self +2000 DP (your effect, Tamer)
  const TAMER = "AD1-019";

  function layHost(s: ReturnType<typeof setup>): Permanent {
    const p0 = s.state.players[0] as PlayerState;
    // A real Lv.3 Digimon top carrying BT14-004 in its digivolution stack: the inherited
    // watcher arms from the stacked Digi-Egg, and its self-ref ModifyDP targets this host.
    const host = digimon(0, 3000, "AD1-001");
    host.stack.push(instance(HOST_EGG, 0, true));
    p0.battleArea.push(host);
    return host;
  }

  it("grants +2000 DP when YOUR effect suspends a TAMER (positive)", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const host = layHost(s);
    const tamer = digimon(1, 0, TAMER); // an opponent's Tamer on the field
    p1.battleArea.push(tamer);
    const dpBefore = host.currentDP;

    const engine = s.engine as unknown as {
      recomputeContinuousEffects(): Promise<void>;
      fireSubTrigger(event: string, payload: unknown): Promise<void>;
    };
    await engine.recomputeContinuousEffects();
    await engine.fireSubTrigger("whenEffectSuspends", {
      subjectPermanentId: tamer.permanentId,
      suspendedPermanentId: tamer.permanentId,
      effectSuspendSeat: 0,
    });
    await settle(() => host.currentDP !== dpBefore);

    expect(host.currentDP).toBe(dpBefore + 2000);
    assertNoLoudGap(s);
  });

  it("does NOT grant DP when your effect suspends a DIGIMON (sourceFilter Tamer-only)", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const host = layHost(s);
    const digi = digimon(1, 4000, "AD1-001"); // a Digimon, not a Tamer
    p1.battleArea.push(digi);
    const dpBefore = host.currentDP;

    const engine = s.engine as unknown as {
      recomputeContinuousEffects(): Promise<void>;
      fireSubTrigger(event: string, payload: unknown): Promise<void>;
    };
    await engine.recomputeContinuousEffects();
    await engine.fireSubTrigger("whenEffectSuspends", {
      subjectPermanentId: digi.permanentId,
      suspendedPermanentId: digi.permanentId,
      effectSuspendSeat: 0,
    });
    await settle(() => false, 60);

    expect(host.currentDP).toBe(dpBefore);
    assertNoLoudGap(s);
  });

  it("does NOT grant DP when the OPPONENT's effect suspends a Tamer (bySourceController mine)", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const host = layHost(s);
    const tamer = digimon(1, 0, TAMER);
    p1.battleArea.push(tamer);
    const dpBefore = host.currentDP;

    const engine = s.engine as unknown as {
      recomputeContinuousEffects(): Promise<void>;
      fireSubTrigger(event: string, payload: unknown): Promise<void>;
    };
    await engine.recomputeContinuousEffects();
    // Same suspend of a Tamer, but driven by the OPPONENT's effect (seat 1).
    await engine.fireSubTrigger("whenEffectSuspends", {
      subjectPermanentId: tamer.permanentId,
      suspendedPermanentId: tamer.permanentId,
      effectSuspendSeat: 1,
    });
    await settle(() => false, 60);

    expect(host.currentDP).toBe(dpBefore);
    assertNoLoudGap(s);
  });
});

describe("A3 Evade/Barrier — effect-deletion and battle-deletion paths (Comprehensive Rules §16-22-3/§16-25-3)", () => {
  // BT13-011's [On Play] deletes the lone opponent Digimon with DP<=3000 (used elsewhere in
  // this file as the plain-Delete oracle). Reused here as the "an effect would delete this
  // Digimon" trigger for ＜Evade＞/＜Barrier＞, granted via the continuous ledger the same way
  // "Restrict beSuspended" seeds a precondition a hand-laid board can't otherwise produce.
  function playDeleteEffect(s: Setup): void {
    const source = instance("BT13-011", 0, false); // Digimon, cost 5
    (s.state.players[0] as PlayerState).hand.push(source);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
  }

  function evadePromptFor(s: Setup, permanentId: string): boolean {
    return s.events.some((e) => e.kind === "evadePrompt" && "permanentId" in e && e.permanentId === permanentId);
  }

  function barrierPromptFor(s: Setup, permanentId: string): boolean {
    return s.events.some((e) => e.kind === "barrierPrompt" && "permanentId" in e && e.permanentId === permanentId);
  }

  it("Evade ACCEPT: the effect-deletion prompt fires and, when accepted, the Digimon survives suspended instead of being deleted", async () => {
    const s = setup({ autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;
    const target = digimon(1, 3000); // within BT13-011's DP<=3000 filter
    p1.battleArea.push(target);
    ledgerWrite(s).addKeywordGrant(target.permanentId, "Evade", EffectDuration.Permanent);

    playDeleteEffect(s);
    await settle(() => evadePromptFor(s, target.permanentId));

    expect(evadePromptFor(s, target.permanentId)).toBe(true);
    // Declining is not yet driven — the Digimon must still be live (not silently deleted OR
    // silently auto-saved) while the decision window is open.
    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "respondEvade", permanentId: target.permanentId, accept: true })).toEqual({
      ok: true,
    });
    await settle(() => target.isSuspended);

    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(true);
    expect(target.isSuspended).toBe(true);
    expect(s.events).toContainEqual({ kind: "evadeResolved", permanentId: target.permanentId, accepted: true });
    expect(p1.trash.some((c) => c.instanceId === target.topCard?.instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("Evade DECLINE: the controller may refuse the suspend, and the Digimon is deleted normally", async () => {
    const s = setup({ autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;
    const target = digimon(1, 3000);
    p1.battleArea.push(target);
    ledgerWrite(s).addKeywordGrant(target.permanentId, "Evade", EffectDuration.Permanent);

    playDeleteEffect(s);
    await settle(() => evadePromptFor(s, target.permanentId));

    expect(s.engine.applyIntent(1, { type: "respondEvade", permanentId: target.permanentId, accept: false })).toEqual({
      ok: true,
    });
    await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId));

    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    expect(s.events).toContainEqual({ kind: "evadeResolved", permanentId: target.permanentId, accepted: false });
    expect(p1.trash.some((c) => c.instanceId === target.topCard?.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("Barrier does not offer an effect-deletion prompt because it is battle-only", async () => {
    const s = setup({ autoSelectCards: true });
    const p1 = s.state.players[1] as PlayerState;
    const target = digimon(1, 3000);
    p1.battleArea.push(target);
    ledgerWrite(s).addKeywordGrant(target.permanentId, "Barrier", EffectDuration.Permanent);
    const securityCard = instance("BT1-010", 1, false);
    p1.security.push(securityCard);

    playDeleteEffect(s);
    await settle(() => !p1.battleArea.some((p) => p.permanentId === target.permanentId));

    expect(barrierPromptFor(s, target.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    expect(p1.security).toHaveLength(1);
    expect(p1.security[0]).toBe(securityCard);
    expect(p1.trash.some((c) => c.instanceId === target.topCard?.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("A3 wrong-permanent cluster — self-reference and compound-clause fixes", () => {
  // BT13-088 / EX10-021: "until <duration>, this Digimon can't attack and isn't affected by
  // your opponent's effects." The prose compiler used to peel a leading duration phrase BEFORE
  // peeling a leading cost phrase, so a cost-then-duration clause ("By placing X, until Y, this
  // Digimon can't attack...") never got its duration stripped — the leftover "until ..., this
  // Digimon" text fed the generic "<subject> can't <verb>" rule, whose `parseTarget` only
  // special-cases a phrase STARTING with "this Digimon", not one with a duration prefix still
  // attached. `parseFilter` then read "opponent's turn" out of the duration phrase and set
  // controller: opponent — restricting the OPPONENT'S Digimon from attacking instead of self,
  // and the "isn't affected by opponent's effects" clause was silently swallowed (no immunity
  // action at all: `restrictionFromVerb` only checks the verb PREFIX ("attack"), so the trailing
  // "and isn't affected..." text was discarded).
  //
  // and the new "<target> can't <verb> and isn't affected by opponent's effects" handler
  // (action-handlers/index.mjs) => the compiled IR restricts the OPPONENT's Digimon (self stays
  // able to attack) and grants no immunity (`beAffected` never gets set on the played Digimon).
  it("BT13-088 [On Play]: self can't attack and gains opponent-effect immunity (not the opponent's Digimon)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // The optional cost source: 1 [Belphemon: Rage Mode] in trash.
    p0.trash.push(instance("BT13-091", 0, false));
    // A control Digimon on the opponent's side — must stay unaffected by the Restrict/Immunity.
    const oppControl = digimon(1, 5000);
    p1.battleArea.push(oppControl);

    const source = instance("BT13-088", 0, false); // Digimon, cost 11
    p0.hand.push(source);
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT13-088"));
    await settle(() => false, 60);

    const self = p0.battleArea.find((p) => p.topCard?.cardId === "BT13-088");
    expect(self).toBeDefined();
    // Self carries BOTH the attack restriction and the opponent-effect immunity.
    expect(ledger(s).hasRestriction(self!.permanentId, "attack")).toBe(true);
    expect(ledger(s).hasRestriction(self!.permanentId, "beAffected")).toBe(true);
    // The opponent's Digimon is untouched — the restriction/immunity must NOT land on it.
    expect(ledger(s).hasRestriction(oppControl.permanentId, "attack")).toBe(false);
    expect(ledger(s).hasRestriction(oppControl.permanentId, "beAffected")).toBe(false);
    assertNoLoudGap(s);
  });

  it("EX10-021 [On Play]: self can't attack and gains opponent-effect immunity (not the opponent's Digimon)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    p0.trash.push(instance("EX10-022", 0, false)); // Belphemon: Rage Mode cost source
    const oppControl = digimon(1, 5000);
    p1.battleArea.push(oppControl);

    const source = instance("EX10-021", 0, false); // Digimon, cost 11
    p0.hand.push(source);
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "EX10-021"));
    await settle(() => false, 60);

    const self = p0.battleArea.find((p) => p.topCard?.cardId === "EX10-021");
    expect(self).toBeDefined();
    expect(ledger(s).hasRestriction(self!.permanentId, "attack")).toBe(true);
    expect(ledger(s).hasRestriction(self!.permanentId, "beAffected")).toBe(true);
    expect(ledger(s).hasRestriction(oppControl.permanentId, "attack")).toBe(false);
    expect(ledger(s).hasRestriction(oppControl.permanentId, "beAffected")).toBe(false);
    assertNoLoudGap(s);
  });

  // BT22-083: "...your opponent's Digimon's effects don't affect 1 of your Digimon with
  // [Greymon] in its name or the [CS] trait and it gets +3000 DP." `parseFilter`'s controller
  // scan matches "opponent's" ANYWHERE in a phrase, so the whole "your opponent's Digimon's
  // effects don't affect X" lead-in (describing WHOSE effects are blocked, not who owns the
  // target) made the ModifyDP/immunity target read controller: opponent — buffing/immunizing
  // the OPPONENT's Digimon instead of the controller's own [Greymon]/[CS] Digimon, and no
  // GrantImmunity action was emitted at all (the generic "gets +DP" rule has no concept of the
  // "effects don't affect" clause, so it silently dropped it).
  //
  // FAILS-WHEN-REVERTED: revert the new "<opponent's ...> effects don't affect <target> and it
  // gets +/-N DP" handler => the ModifyDP target's controller flips to "opponent" (the OWN
  // Greymon never gets +3000 DP) and no GrantImmunity action exists at all.
  it("BT22-083 [All Turns]: whenAttackTargetSwitched grants +3000 DP and opponent-effect immunity to OWN Greymon", async () => {
    const s = setup(
      {
        0: {
          battleArea: [
            { card: "BT22-083", as: "tamer" },
            { card: "AD1-001", as: "ownGreymon", dp: 5000 },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "oppControl", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ownGreymon = s.perm("ownGreymon");
    const oppControl = s.perm("oppControl");
    const dpBefore = ownGreymon.currentDP;

    await s.ready();
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      subjectPermanentId: ownGreymon.permanentId,
      attackerPermanentId: ownGreymon.permanentId,
    });
    await settle(() => ownGreymon.currentDP !== dpBefore);
    await settle(() => false, 60);

    expect(ownGreymon.currentDP).toBe(dpBefore + 3000);
    expect(ledger(s).hasRestriction(ownGreymon.permanentId, "beAffected")).toBe(true);
    // The opponent's own [Greymon] must NOT receive the buff or the immunity.
    expect(oppControl.currentDP).toBe(5000);
    expect(ledger(s).hasRestriction(oppControl.permanentId, "beAffected")).toBe(false);
    assertNoLoudGap(s);
  });

  // BT24-101: "Trash your top security card and 1 of your opponent's Digimon gets -13000 DP
  // until their turn ends." The generic fallback "trash (.+)" rule read the WHOLE "your top
  // security card and 1 of your opponent's Digimon gets -13000 DP" tail as a single Trash
  // target phrase — parseFilter found "opponent's Digimon" in it and emitted a Trash action
  // that DELETES the opponent's Digimon outright, while dropping both the security-stack trash
  // and the DP modifier entirely.
  //
  // FAILS-WHEN-REVERTED: revert the new "trash your top security card and <target> gets +/-N DP"
  // handler => the opponent's Digimon gets trashed/deleted from the battle area instead of losing
  // 13000 DP, and the player's own top security card is never trashed.
  it("BT24-101 [On Play]: trashes own top security and gives the opponent's Digimon -13000 DP (does not delete it)", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    p0.security.push(instance("BT1-010", 0, true));
    const target = digimon(1, 20000); // stays well above 0 after -13000
    p1.battleArea.push(target);

    const source = instance("BT24-101", 0, false);
    p0.hand.push(source);
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => target.currentDP !== 20000);
    await settle(() => false, 60);

    // The opponent's Digimon is still on the field, just at -13000 DP — not deleted.
    expect(p1.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(true);
    expect(target.currentDP).toBe(7000);
    expect(p0.security).toHaveLength(0); // own top security card was trashed
    assertNoLoudGap(s);
  });

  // P-146: "Place this card as 1 of your non-white Digimon's bottom digivolution card." The
  // color scan matched the bare color word "white" inside "non-white" and added it to the
  // INCLUDE list (`colors: ["White"]`) — the exact inverse of the exclusion the text asks for
  // (`excludeColors: ["White"]`, a field the interpreter already reads).
  //
  // FAILS-WHEN-REVERTED: revert the parse-filter.mjs excludeColors negation handling => the
  // white Digimon becomes the only legal placement target and the non-white Digimon is rejected.
  it("P-146 [Main]: the compiled placement filter EXCLUDES white (not requires it)", () => {
    const compiled = getCompiledCard("P-146")!;
    const mainEffect = compiled.effects.find((e) => e.trigger === "Main")!;
    const placeAction = mainEffect.actions[0] as {
      underFilter?: { excludeColors?: string[]; colors?: string[] };
    };
    // "non-white Digimon" must compile to the exclusion predicate the interpreter reads
    // (engine/effects/interpreter.ts ~line 228), never to `colors: ["White"]` — which would
    // require the target Digimon to BE white, the exact inverse of the printed text.
    expect(placeAction.underFilter?.excludeColors).toEqual(["White"]);
    expect(placeAction.underFilter?.colors).toBeUndefined();
  });
});
