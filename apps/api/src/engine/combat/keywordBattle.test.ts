import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { MemoryGauge } from "../MemoryGauge.js";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
  type EngineSetup,
} from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * A3 behavioral proofs for the two gaps documented in combat/resolve.ts and
 * combat/legality.ts:
 *
 *   1. ＜Iceclad＞ (Comprehensive Rules §16-35): "you compare the number of
 *      digivolution cards instead of DP when you battle using the Digimon with
 *      this effect, other than battles against Security Digimon."
 *      §16-35-4: higher digivolution-card count wins; equal counts is a tie
 *      (both lose). Real card targeted: BT22-077 (Dianamon) — printed ＜Iceclad＞
 *      ＜Blocker＞ (KB query.mjs card BT22-077: no Q&A contradicts this reading).
 *
 *   2. A "can't be deleted in battle" grant (the `beDeletedInBattle` continuous
 *      restriction) spares a battle loser. Real card targeted: BT3-099 ("We Have
 *      to Stop Fighting!") — "[Main] Neither player's Digimon can be deleted in
 *      battle for the turn," already compiled to `ctx.fx.restrict(...,
 *      "beDeletedInBattle", ...)` (apps/api/src/cards/BT3/BT3-099.ts) but never
 *      previously consumed by combat resolution.
 *
 *   3. ＜Collision＞ (Comprehensive Rules §16-30): "While a Digimon with this
 *      effect is attacking, all of your opponent's Digimon gain ＜Blocker＞ and
 *      the opponent player is forced to block whenever possible during the block
 *      timing." Real card targeted: BT16-032 (Sheepmon) — printed ＜Collision＞.
 *
 * Each mechanic gets a positive case and a NEGATIVE CONTROL proving the default
 * path is unchanged when the keyword/restriction is absent.
 */

const ICECLAD_CARD = "BT22-077"; // Dianamon: printed ＜Iceclad＞ ＜Blocker＞
const COLLISION_CARD = "BT16-032"; // Sheepmon: printed ＜Collision＞
const NON_KEYWORD_CARD = "AD1-001"; // plain Digimon: no printed keywords
const ACE = "BT14-014"; // isAce: true, overflowMemory: 3 (see overflow.test.ts)
const ACE_OVERFLOW = 3;

function memoryFor(s: EngineSetup, seat: 0 | 1): number {
  return new MemoryGauge(s.state).memoryFor(seat);
}

/** Push `count` bare digivolution cards onto `permanent`'s stack. */
function stackCards(permanent: { stack: { push: (c: ReturnType<typeof instance>) => void } }, seat: 0 | 1, count: number): void {
  for (let i = 0; i < count; i++) {
    permanent.stack.push(instance(NON_KEYWORD_CARD, seat, true));
  }
}

/** Play BT3-099 ([Main] "Neither player's Digimon can be deleted in battle for the turn") from seat 0's hand. */
async function playNoBattleDeletion(s: EngineSetup): Promise<void> {
  const p0 = s.state.players[0] as PlayerState;
  p0.battleArea.push(digimon(0, 3000, "BT1-027")); // §4-21 color-requirement source (Blue)
  const card = instance("BT3-099", 0, true);
  p0.hand.push(card);
  s.state.memory = 2; // BT3-099's printed play cost
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: card.instanceId })).toEqual({
    ok: true,
  });
  // The Option lands in trash BEFORE its [Main] (OnUseOption) effect fires (playCard.ts routes
  // it to trash first so fireTimingForInstance can find it), so waiting on the trash move alone
  // races the restrict() calls inside the effect. Flush the rest of the resolution too.
  await settle(() => p0.trash.some((c) => c.instanceId === card.instanceId));
  await settle(() => false, 40);
}

describe("<Iceclad> (Comprehensive Rules §16-35) — compare digivolution-card counts instead of DP", () => {
  it("DP-vs-digivolution-count DISAGREEMENT: the Iceclad Digimon wins on count despite losing on DP", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Attacker: huge DP, NO digivolution cards.
    const attacker = digimon(0, 20000);
    p0.battleArea.push(attacker);

    // Defender: tiny DP but printed ＜Iceclad＞ and 3 digivolution cards.
    const defender = digimon(1, 5000, ICECLAD_CARD);
    defender.isSuspended = true; // legal direct-attack target, no block window
    stackCards(defender, 1, 3);
    p1.battleArea.push(defender);

    // The printed ＜Iceclad＞ keyword becomes a live ledger grant via BT22-077's own
    // compiled Static effect, re-derived at each continuous recompute (the same
    // mechanism EVERY printed keyword uses — see e.g. apps/api/src/cards/BT16/BT16-032.ts).
    // A card laid directly onto the board (bypassing playCard/digivolve) needs one
    // explicit recompute to pick that grant up.
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    // Flush the whole resolution rather than racing an early "either side hit 0" check: the
    // block-window / decision machinery can transiently touch battleArea.length mid-resolution
    // before the final state settles, so a first-observed-zero predicate can race.
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    // Under DP (20000 vs 5000) the attacker would crush the defender. Under Iceclad's
    // digivolution-count comparison (0 vs 3) the DEFENDER wins instead.
    expect(p1.battleArea).toHaveLength(1); // defender survived
    expect(p0.battleArea).toHaveLength(0); // attacker was deleted
  });

  it("NEGATIVE CONTROL: without Iceclad, DP alone decides even though digivolution counts disagree", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 20000); // no Iceclad, no digivolution cards
    p0.battleArea.push(attacker);

    const defender = digimon(1, 5000, NON_KEYWORD_CARD); // no Iceclad, 3 digivolution cards
    defender.isSuspended = true;
    stackCards(defender, 1, 3);
    p1.battleArea.push(defender);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 300);

    // Plain DP comparison: the 20000-DP attacker wins as usual.
    expect(p1.battleArea).toHaveLength(0); // defender was deleted
    expect(p0.battleArea).toHaveLength(1); // attacker survived
  });

  it("Iceclad tie: equal digivolution-card counts is a tie, deleting BOTH", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 20000, ICECLAD_CARD); // Iceclad, DP irrelevant
    stackCards(attacker, 0, 2);
    p0.battleArea.push(attacker);

    const defender = digimon(1, 1000, NON_KEYWORD_CARD); // low DP, same digivolution count
    defender.isSuspended = true;
    stackCards(defender, 1, 2);
    p1.battleArea.push(defender);

    await s.engine.recomputeContinuousEffects(); // pick up the attacker's printed ＜Iceclad＞

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 600);

    expect(p0.battleArea).toHaveLength(0);
    expect(p1.battleArea).toHaveLength(0);
  });

  it("REGRESSION: blocking with an ＜Iceclad＞ Digimon offers NO ally-suspend decision — §16-35-1 is only the DP-vs-digivolution-count swap", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 5000, NON_KEYWORD_CARD);
    p0.battleArea.push(attacker);
    const blocker = digimon(1, 5000, ICECLAD_CARD); // BT22-077: printed ＜Iceclad＞ ＜Blocker＞
    const ally = digimon(1, 9000, NON_KEYWORD_CARD); // would-be "alliance" target — must never be prompted
    p1.battleArea.push(blocker, ally);
    await s.engine.recomputeContinuousEffects(); // pick up BT22-077's printed ＜Iceclad＞ ＜Blocker＞

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"));

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId }),
    ).toEqual({ ok: true });
    await settle(() => false, 300);

    // No <Alliance>-style ally-suspend decision under the ＜IceClad＞ name, and the ally is
    // never suspended (it would have been, had the fabricated block still run).
    expect(s.events.some((e) => e.kind === "alliancePrompt")).toBe(false);
    expect(ally.isSuspended).toBe(false);
    expect(blocker.currentDP).toBe(5000); // no fabricated DP addition from the ally
  });
});

describe("beDeletedInBattle restriction — a granted \"can't be deleted in battle\" spares the loser", () => {
  it("BT3-099's Main effect spares a Digimon that would otherwise lose the battle", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);
    const defender = digimon(1, 4000, NON_KEYWORD_CARD);
    defender.isSuspended = true;
    p1.battleArea.push(defender);

    await playNoBattleDeletion(s); // "Neither player's Digimon can be deleted in battle for the turn."

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 60); // flush combat resolution

    // The defender lost the DP comparison (4000 < 9000) but the restriction spares it.
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(true);
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true); // attacker survives regardless (it won)
  });

  it("NEGATIVE CONTROL: without the restriction, the identical battle deletes the loser as usual", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);
    const defender = digimon(1, 4000, NON_KEYWORD_CARD);
    defender.isSuspended = true;
    p1.battleArea.push(defender);

    // BT3-099 is NOT played this time.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.battleArea.length === 0);

    expect(p1.battleArea).toHaveLength(0); // defender WAS deleted
  });

  it("a spared ACE does NOT pay <Overflow> — the deletion never happens, so neither does the memory charge", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);
    const defender = digimon(1, 4000, ACE); // BT14-014: isAce, overflowMemory 3
    defender.isSuspended = true;
    p1.battleArea.push(defender);

    await playNoBattleDeletion(s);

    const before = memoryFor(s, 1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 60);

    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(true); // spared, not deleted
    expect(memoryFor(s, 1)).toBe(before); // <Overflow> did NOT charge — there was no deletion to trigger it
  });

  it("NEGATIVE CONTROL: without sparing, the same ACE dying in battle DOES pay <Overflow>", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 9000);
    p0.battleArea.push(attacker);
    const defender = digimon(1, 4000, ACE);
    defender.isSuspended = true;
    p1.battleArea.push(defender);

    const before = memoryFor(s, 1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p1.battleArea.length === 0);

    expect(memoryFor(s, 1)).toBe(before - ACE_OVERFLOW);
  });
});

describe("<Collision> (Comprehensive Rules §16-30) — grants Blocker and forces the opponent to block when able", () => {
  it("grants a non-Blocker opponent Digimon eligibility to block, and rejects a decline while it can", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 5000, COLLISION_CARD); // printed ＜Collision＞
    p0.battleArea.push(attacker);
    const nonBlocker = digimon(1, 3000, NON_KEYWORD_CARD); // no printed ＜Blocker＞
    p1.battleArea.push(nonBlocker);

    await s.engine.recomputeContinuousEffects(); // pick up BT16-032's printed ＜Collision＞ grant

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    const opened = await (async () => {
      await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"));
      return s.events.find((e) => e.kind === "blockWindowOpened");
    })();
    expect(opened && "eligibleBlockerIds" in opened ? opened.eligibleBlockerIds : []).toContain(
      nonBlocker.permanentId,
    );

    // Declaring the block with the Collision-granted blocker is legal.
    const block = s.engine.applyIntent(1, {
      type: "declareBlock",
      blockerPermanentId: nonBlocker.permanentId,
    });
    expect(block).toEqual({ ok: true });
  });

  it("rejects declineBlock while an eligible (Collision-granted) blocker exists", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 5000, COLLISION_CARD);
    p0.battleArea.push(attacker);
    const nonBlocker = digimon(1, 3000, NON_KEYWORD_CARD);
    p1.battleArea.push(nonBlocker);
    await s.engine.recomputeContinuousEffects();

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"));

    // "the opponent player is forced to block whenever possible" — a decline is illegal here.
    const decline = s.engine.applyIntent(1, { type: "declineBlock" });
    expect(decline.ok).toBe(false);
  });

  it("NEGATIVE CONTROL: without Collision, the same non-Blocker opponent Digimon cannot block, and the attack proceeds unblocked", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 5000, NON_KEYWORD_CARD); // no Collision
    p0.battleArea.push(attacker);
    const nonBlocker = digimon(1, 3000, NON_KEYWORD_CARD);
    p1.battleArea.push(nonBlocker);
    p1.security.push(instance(NON_KEYWORD_CARD, 1, false)); // one security so the attack doesn't win outright

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    });
    // With no ＜Blocker＞ and no ＜Collision＞ grant, nothing is eligible to block: the window
    // resolves immediately and the protocol does not announce a response window.
    await settle(() => p1.security.length === 0);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);

    const block = s.engine.applyIntent(1, {
      type: "declareBlock",
      blockerPermanentId: nonBlocker.permanentId,
    });
    expect(block.ok).toBe(false); // rejected: no ＜Blocker＞, and no Collision grant

    // No eligible blocker ever existed, so the window auto-resolved and already passed — there
    // is nothing left open to decline (declineBlock correctly reports no open window for this seat).
    const decline = s.engine.applyIntent(1, { type: "declineBlock" });
    expect(decline).toEqual({ ok: false, reason: "wrong-phase" });
    expect(p1.security).toHaveLength(0); // the attack proceeded straight to security
  });

  it("REGRESSION: switching the attack onto a Collision-granted blocker grants NO DP bonus — §16-30-1 is only the forced Blocker grant", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // 4000 DP attacker vs. a 6000 DP blocker: without any invented DP bonus the
    // blocker wins outright. A previously-fabricated "+3000 DP on target switch"
    // block would have flipped this to an attacker win (7000 > 6000).
    const attacker = digimon(0, 4000, COLLISION_CARD);
    p0.battleArea.push(attacker);
    const blocker = digimon(1, 6000, NON_KEYWORD_CARD); // no printed ＜Blocker＞, no ＜IceClad＞
    p1.battleArea.push(blocker);
    await s.engine.recomputeContinuousEffects(); // pick up BT16-032's printed ＜Collision＞ grant

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"));

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blocker.permanentId }),
    ).toEqual({ ok: true });
    await settle(() => false, 300);

    // No hidden DP modifier: the 6000 DP blocker wins the battle as printed stats dictate.
    expect(attacker.currentDP).toBe(4000); // no fabricated +3000 boost
    expect(p0.battleArea).toHaveLength(0); // attacker (4000) lost to the blocker (6000)
    expect(p1.battleArea.some((p) => p.permanentId === blocker.permanentId)).toBe(true);
    // No <Alliance>-style ally-suspend decision was ever offered under either keyword's name.
    expect(s.events.some((e) => e.kind === "alliancePrompt")).toBe(false);
  });
});
