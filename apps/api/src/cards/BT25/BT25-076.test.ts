import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
// Boot side-effect: self-register every compiled-IR card module (so BT25-076's real IR loads).
import "../index.js";

/**
 * Full-engine A3 for BT25-076 Ghoulmon's pay-time SACRIFICE cost-reduction clause (plan 08-11),
 * consuming the new BeforePayCost hook with a DYNAMIC delta:
 *
 *   "When this card would be played, by deleting 1 of your play cost 11 or lower Digimon with
 *    [Negamon] in its digivolution cards and [Negamon] in its text, reduce the cost by the deleted
 *    Digimon's play cost."   (documented behavior BeforePayCost branch: reducedCost = sacrificed
 *    permanent's TopCard.GetCostItself.)
 *
 * KB authority (node tools/kb/query.mjs card BT25-076): the shared OP/WA/OD delete uses the lowest
 * play cost (Q6373) — that selector is tested by EX10-073. This A3 isolates the DYNAMIC pay-time
 * delta: it equals the SACRIFICED Digimon's printed play cost (not a static amount).
 *
 * BT25-076 has a printed play cost of 12. The play action fires the in-hand card's BeforePayCost
 * window before paying: the ReducePlayCost action runs the OPTIONAL sacrifice SERVER-SIDE (delete
 * one of the controller's eligible Digimon) and earns a delta equal to that Digimon's play cost.
 *
 * TWO-RUN play-cost DELTA (the honesty-contract A3):
 *   Run A (sacrifice a cost-11 [Negamon] Digimon) pays 1; Run B (decline) pays 12.
 *   The exact-11 difference is the deleted Digimon's play cost, computed SERVER-SIDE (T-08-26).
 *
 * FAILS-WHEN-REVERTED lever: disable the BeforePayCost hook (no delta accumulates) => Run A also
 *   pays the full 12 => the "delta equals the sacrificed cost" assertion goes RED.
 */

const BT25_076 = "BT25-076"; // Ghoulmon, Digimon, playCost 12
const NEGAMON_TEXT_11 = "EX9-055"; // Abbadomon — cost-11 [Negamon]-text Digimon (the sacrifice)
const NEGAMON_EGG = "EX9-005"; // Negamon — the [Negamon]-NAMED card placed in the sacrifice's stack

describe("A3 BT25-076 — BeforePayCost sacrifice cost reduction (dynamic delta = deleted cost)", () => {
  it("sacrificing a cost-11 [Negamon] Digimon reduces the play cost by exactly 11 (pays 1 vs 12)", async () => {
    // Run A: accept the optional sacrifice.
    // Positive memory favors the turn seat; memory 2 => seat 0 can afford up to 12 (the unreduced
    // cost), so the synchronous validation passes on the printed cost and the BeforePayCost reduction
    // is finalized in the async step (the immediate-validation contract is preserved).
    const a = setupEngine(
      {
        0: {
          // A cost-11 [Negamon]-text Digimon WITH a [Negamon]-named card in its digivolution
          // stack (both gates the documented behavior CanSelectPermanentCondition requires).
          battleArea: [{ card: NEGAMON_TEXT_11, dp: 12000, as: "sacA", under: [NEGAMON_EGG] }],
          hand: [{ card: BT25_076, as: "ghoulA" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    a.state.memory = 2;
    const p0a = a.state.players[0] as PlayerState;
    const sacAId = a.perm("sacA").permanentId;
    const ghoulAId = a.inst("ghoulA").instanceId;
    const beforeA = a.state.memory;
    const ra = a.engine.applyIntent(0, { type: "playCard", instanceId: ghoulAId });
    expect(ra.ok).toBe(true);
    await settle(() => p0a.battleArea.some((p) => p.topCard?.cardId === BT25_076), 300);
    const paidA = beforeA - a.state.memory;

    // Run B: decline the optional sacrifice — full cost 12.
    const b = setupEngine(
      {
        0: {
          battleArea: [{ card: NEGAMON_TEXT_11, dp: 12000, as: "sacB", under: [NEGAMON_EGG] }],
          hand: [{ card: BT25_076, as: "ghoulB" }],
        },
      },
      { autoSelectCards: true }, // no autoAcceptOptional — declines the sacrifice prompt
    );
    b.state.memory = 2;
    const p0b = b.state.players[0] as PlayerState;
    const ghoulBId = b.inst("ghoulB").instanceId;
    const beforeB = b.state.memory;
    const rb = b.engine.applyIntent(0, { type: "playCard", instanceId: ghoulBId });
    expect(rb.ok).toBe(true);
    // No autoAcceptOptional — respond to the sacrifice prompt manually, declining it, since the
    // harness's opts only express auto-accept, not auto-decline.
    await settle(() => b.decisions.some((d) => d.req.kind === "optional"), 60);
    const promptB = b.decisions.find((d) => d.req.kind === "optional");
    expect(promptB).toBeDefined();
    if (promptB !== undefined) {
      b.engine.applyIntent(promptB.seat, {
        type: "respondDecision",
        decisionId: promptB.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await settle(() => p0b.battleArea.some((p) => p.topCard?.cardId === BT25_076), 300);
    const paidB = beforeB - b.state.memory;

    // FAILS-WHEN-REVERTED: with the BeforePayCost hook disabled, Run A would also pay 12 => delta 0.
    expect(paidB).toBe(12); // full printed cost (no reduction)
    expect(paidA).toBe(1); // 12 - the sacrificed Digimon's cost (11)
    expect(paidB - paidA).toBe(11); // the DYNAMIC delta equals the deleted Digimon's play cost

    // The sacrifice ran SERVER-SIDE: Run A's eligible Digimon was deleted (the payment), Run B's
    // survived (declined). The delta is derived from the DELETED card, never client-supplied.
    expect(p0a.battleArea.find((p) => p.permanentId === sacAId)).toBeUndefined();
    expect(p0b.battleArea.some((p) => p.topCard?.cardId === NEGAMON_TEXT_11)).toBe(true);
  });

  it("offers no sacrifice when no eligible [Negamon] Digimon is in play (pays full 12)", async () => {
    // A cost-11 [Negamon]-text Digimon but WITHOUT a [Negamon] card in its stack => ineligible
    // (the documented behavior requires DigivolutionCards.Count(EqualsCardName("Negamon")) > 0).
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NEGAMON_TEXT_11, dp: 12000, as: "noStack" }],
          hand: [{ card: BT25_076, as: "ghoul" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const p0 = s.state.players[0] as PlayerState;
    const noStackId = s.perm("noStack").permanentId;
    const ghoulId = s.inst("ghoul").instanceId;
    const before = s.state.memory;
    const r = s.engine.applyIntent(0, { type: "playCard", instanceId: ghoulId });
    expect(r.ok).toBe(true);
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === BT25_076), 300);
    const paid = before - s.state.memory;
    // No eligible sacrifice => no reduction => full cost; the [Negamon]-text Digimon survives.
    expect(paid).toBe(12);
    expect(p0.battleArea.find((p) => p.permanentId === noStackId)).toBeDefined();
  });
});
