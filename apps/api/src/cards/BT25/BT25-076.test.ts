import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
// Register only the card under audit plus the real Datamon immunity used by the fallback proof;
// fixture definitions remain available from the shared catalog without booting the whole set.
import "./BT25-076.js";
import "../BT14/BT14-062.js";

function fireTiming(
  s: { engine: unknown },
  timing: EffectTiming,
  trigger: Record<string, unknown> = {},
): Promise<void> {
  return (
    s.engine as unknown as { fireTiming(t: EffectTiming, tr?: Record<string, unknown>): Promise<void> }
  ).fireTiming(timing, trigger);
}

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
          battleArea: [
            { card: NEGAMON_TEXT_11, dp: 12000, as: "sacA", under: ["EX9-005", "EX9-046", "EX9-047", "EX9-054"] },
          ],
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
          battleArea: [
            { card: NEGAMON_TEXT_11, dp: 12000, as: "sacB", under: ["EX9-005", "EX9-046", "EX9-047", "EX9-054"] },
          ],
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

  it("matches the catalog identity, Black level-5 evolution, and all three static keywords", async () => {
    expect(getCardDefinition(BT25_076)).toMatchObject({
      nameEn: "Ghoulmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      types: ["Demon Lord"],
    });
    expect(getCardDefinition(BT25_076)?.evoCosts).toEqual([{ color: "Black", level: 5, memoryCost: 3 }]);

    const legal = setupEngine({
      0: { battleArea: [{ card: "BT14-062", as: "blackLv5" }], hand: [{ card: BT25_076, as: "ghoul" }] },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("blackLv5").permanentId,
        instanceId: legal.inst("ghoul").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("blackLv5").topCard.cardId === BT25_076);
    await legal.engine.recomputeContinuousEffects();
    expect(legal.state.memory).toBe(0);
    expect(observe(legal.engine).hasKeyword(legal.perm("blackLv5"), "Rush")).toBe(true);
    expect(observe(legal.engine).hasKeyword(legal.perm("blackLv5"), "Reboot")).toBe(true);
    expect(observe(legal.engine).hasKeyword(legal.perm("blackLv5"), "Blocker")).toBe(true);

    const wrongColor = setupEngine({
      0: { battleArea: [{ card: "BT1-114", as: "redLv5" }], hand: [{ card: BT25_076, as: "ghoul" }] },
    });
    wrongColor.state.memory = 3;
    expect(
      wrongColor.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongColor.perm("redLv5").permanentId,
        instanceId: wrongColor.inst("ghoul").instanceId,
      }).ok,
    ).toBe(false);
  });

  it("ordinary-digivolves from a black Lv.5 source at cost 3 and rejects a wrong color", async () => {
    const ordinary = setupEngine({
      0: { battleArea: [{ card: "BT10-064", as: "blackBase" }], hand: [{ card: BT25_076, as: "ghoul" }] },
    });
    ordinary.state.memory = 4;
    expect(
      ordinary.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ordinary.perm("blackBase").permanentId,
        instanceId: ordinary.inst("ghoul").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => ordinary.perm("blackBase").topCard?.cardId === BT25_076);
    expect(ordinary.state.memory).toBe(1);

    const wrong = setupEngine({
      0: { battleArea: [{ card: "AD1-002", as: "redBase" }], hand: [{ card: BT25_076, as: "ghoul" }] },
    });
    wrong.state.memory = 4;
    expect(
      wrong.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrong.perm("redBase").permanentId,
        instanceId: wrong.inst("ghoul").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("requires the exact [Negamon] card name in the stack and enforces the play-cost 11 boundary", async () => {
    const overCost = setupEngine(
      {
        0: {
          battleArea: [{ card: BT25_076, as: "overCost", under: ["EX9-005", "EX9-046", "EX9-047", "EX9-054"] }],
          hand: [{ card: BT25_076, as: "ghoul" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    overCost.state.memory = 2;
    const before = overCost.state.memory;
    expect(overCost.engine.applyIntent(0, { type: "playCard", instanceId: overCost.inst("ghoul").instanceId }).ok).toBe(
      true,
    );
    await settle(
      () => overCost.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === BT25_076).length === 2,
      300,
    );
    expect(before - overCost.state.memory).toBe(12);

    const nearMatch = setupEngine(
      {
        0: {
          // [Negamon] appears in EX9-055's text, but the stack gate is card-name, not text/trait.
          battleArea: [{ card: NEGAMON_TEXT_11, as: "wrongStack", under: ["EX9-046", "EX9-047", "EX9-054"] }],
          hand: [{ card: BT25_076, as: "ghoul" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nearMatch.state.memory = 2;
    const beforeNear = nearMatch.state.memory;
    expect(
      nearMatch.engine.applyIntent(0, { type: "playCard", instanceId: nearMatch.inst("ghoul").instanceId }).ok,
    ).toBe(true);
    await settle(() => nearMatch.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === BT25_076), 300);
    expect(beforeNear - nearMatch.state.memory).toBe(12);
    expect(nearMatch.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === NEGAMON_TEXT_11)).toBe(true);
  });
});

describe("A3 BT25-076 — lowest-cost delete, fallback security, and shared timings", () => {
  for (const [label, timing] of [
    ["On Play", EffectTiming.OnPlay],
    ["When Attacking", EffectTiming.OnUseAttack],
    ["On Deletion", EffectTiming.OnDestroyedAnyone],
  ] as const) {
    it(`${label} deletes only the opponent's lowest-play-cost Digimon`, async () => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: BT25_076, as: "ghoul" }] },
          1: {
            battleArea: [
              { card: "BT1-013", as: "low" },
              { card: "BT24-015", as: "high" },
            ],
            security: ["BT1-013", "BT1-013"],
          },
        },
        { autoSelectCards: true },
      );
      const lowId = s.perm("low").permanentId;
      const highId = s.perm("high").permanentId;
      await fireTiming(s, timing);
      await settle(() => s.state.players[1]!.battleArea.every((p) => p.permanentId !== lowId), 200);
      expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(false);
      expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(true);
      expect(s.state.players[1]!.security).toHaveLength(2);
    });
  }

  it("trashes exactly the opponent's top security when no Digimon exists", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: BT25_076, as: "ghoul" }] }, 1: { security: ["BT1-013", "BT1-013"] } },
      { autoSelectCards: true },
    );
    await fireTiming(s, EffectTiming.OnPlay);
    await settle(() => s.state.players[1]!.security.length === 1, 200);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("uses the fallback when the mandatory lowest-cost target is deletion-immune", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: BT25_076, as: "ghoul" }] },
        1: { battleArea: [{ card: "BT14-062", as: "immune" }], security: ["BT1-013", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    const immuneId = s.perm("immune").permanentId;
    await fireTiming(s, EffectTiming.OnPlay);
    await settle(() => s.state.players[1]!.security.length === 1, 200);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === immuneId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });
});
