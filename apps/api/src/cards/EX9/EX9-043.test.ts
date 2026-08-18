import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
// Boot side-effect: self-register every compiled-IR card module (so EX9-043's real IR loads).
import "../index.js";

/**
 * Full-engine A3 for EX9-043 MetalTyrannomon's pay-time interactive cost-reduction clause (plan
 * 08-11), consuming the new BeforePayCost hook:
 *
 *   "When this card would be played, by trashing 1 [Cyborg]/[Ver.5] trait card from your hand,
 *    reduce the play cost by 2."   (documented behavior BeforePayCost branch: optional trash -> -2.)
 *
 * KB authority (node tools/kb/query.mjs card EX9-043):
 *   Q4796: the trash sub-effect is usable even when the card is played without paying its cost
 *     (the payment is OPTIONAL — documented behavior canNoSelect = true).
 *
 * EX9-043 has a printed play cost of 7. The play action fires the in-hand card's BeforePayCost
 * window before paying: the ReducePlayCost action runs the OPTIONAL trash payment SERVER-SIDE and
 * earns a fixed -2 delta, which is floored into the cost before memory is spent.
 *
 * TWO-RUN play-cost DELTA (the honesty-contract A3):
 *   Run A (trash a [Cyborg] card from hand) pays 5; Run B (decline the optional trash) pays 7.
 *   The exact-2 difference is the reduction, computed server-side from what was trashed (T-08-26).
 *
 * FAILS-WHEN-REVERTED lever: disable the BeforePayCost hook (no delta accumulates) => Run A also
 *   pays the full 7 => the "delta is exactly 2" assertion goes RED. (Verified by deleting the
 *   ReducePlayCost case from the interpreter / the finalizePlayCost dep from the engine.)
 */

const CYBORG = "BT1-021"; // MetalGreymon — Cyborg-trait Digimon (the trashable payment card)
const PLAIN = "BT1-009"; // Monodramon — NOT Cyborg/Ver.5 (a non-eligible hand card)

describe("A3 EX9-043 — BeforePayCost interactive cost reduction (optional trash -> -2)", () => {
  it("trashing a [Cyborg] card reduces the play cost by exactly 2 (pays 5 vs 7)", async () => {
    // Run A: accept the optional trash of a Cyborg card.
    const a = setupEngine(
      { 0: { hand: [{ card: "EX9-043", as: "ex9a" }, { card: CYBORG, as: "cyborgA" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    a.state.memory = 0; // positive memory favors the turn seat; memory 0 => seat 0 can afford up to 10 (cost 7 is fine)
    const p0a = a.state.players[0] as PlayerState;
    const cyborgAId = a.inst("cyborgA").instanceId;
    const beforeA = a.state.memory;
    const ra = a.engine.applyIntent(0, { type: "playCard", instanceId: a.inst("ex9a").instanceId });
    expect(ra.ok).toBe(true);
    await settle(() => p0a.battleArea.length > 0, 200);
    const paidA = beforeA - a.state.memory; // memory moved toward the opponent by the cost paid

    // Run B: decline the optional trash — full cost.
    const b = setupEngine(
      { 0: { hand: [{ card: "EX9-043", as: "ex9b" }, { card: CYBORG, as: "cyborgB" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    b.state.memory = 0;
    const p0b = b.state.players[0] as PlayerState;
    const cyborgBId = b.inst("cyborgB").instanceId;
    const beforeB = b.state.memory;
    const rb = b.engine.applyIntent(0, { type: "playCard", instanceId: b.inst("ex9b").instanceId });
    expect(rb.ok).toBe(true);
    await settle(() => p0b.battleArea.length > 0, 200);
    const paidB = beforeB - b.state.memory;

    // FAILS-WHEN-REVERTED: with the BeforePayCost hook disabled, Run A would also pay 7 => delta 0.
    expect(paidB).toBe(7); // full printed cost (no reduction)
    expect(paidA).toBe(5); // reduced cost
    expect(paidB - paidA).toBe(2); // the reduction is EXACTLY 2

    // The OPTIONAL payment was offered + paid SERVER-SIDE: Run A prompted to select a card to trash
    // (the Cyborg was the only eligible payment card; the card being played is excluded), Run B did
    // not pay (declined). The Cyborg left Run A's hand as the payment; it remained in Run B's hand.
    expect(a.decisions.some((d) => d.req.kind === "selectCards")).toBe(true);
    expect(p0a.hand.find((c) => c.instanceId === cyborgAId)).toBeUndefined();
    expect(p0b.hand.find((c) => c.instanceId === cyborgBId)).toBeDefined();
  });

  it("does not offer the reduction when no [Cyborg]/[Ver.5] card is in hand (pays full 7)", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX9-043", as: "ex9" }, { card: PLAIN, as: "plain" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const plainId = s.inst("plain").instanceId;
    const before = s.state.memory;
    const r = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ex9").instanceId });
    expect(r.ok).toBe(true);
    await settle(() => p0.battleArea.length > 0, 200);
    const paid = before - s.state.memory;
    // No eligible payment card => no optional prompt, no reduction => full cost.
    expect(paid).toBe(7);
    expect(p0.hand.find((c) => c.instanceId === plainId)).toBeDefined();
  });
});
