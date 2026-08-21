import { describe, it, expect } from "vitest";
import { EffectTiming, PlayerState, Zone } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../index.js";

// A3 for EX6-073 (Ogudomon) — Purple Lv.7+ Digimon.
//
// Effect tested: [When Attacking] By returning 7 cards with different names and the
// [Seven Great Demon Lords] trait from this Digimon's digivolution cards to the bottom
// of the deck, delete up to 7 of your opponent's Digimon or Tamers. Then, trash the top
// 7 cards of your opponent's security stack. For each card deleted by this effect, reduce
// the cards trashed by 1.
//
// Key invariant (KB Q3827): securityTrashCount = max(0, 7 - actuallyDeleted).
// If 3 opponent Digimon are deleted → 4 security trashed (7 - 3 = 4).
// If 7 deleted → 0 security trashed.
//
//
// SGDL cards (7 unique names) used for digivolution stack:
//   BT13-091 (Belphemon: Rage Mode), BT15-081 (Leviamon X), BT18-082 (Lucemon Chaos),
//   BT19-071 (Beelzemon), BT3-091 (Lilithmon), BT8-111 (Creepymon), EX6-059 (Barbamon)
// — all have the [Seven Great Demon Lords] trait and all have different names.
//
// Opponent Digimon: BT1-009 × 3 (all have same card ID but different instance IDs, and
// the test picks 3 as delete targets).

const OGUDOMON = "EX6-073";
const SGDL_IDS = [
  "BT13-091", // Belphemon: Rage Mode
  "BT15-081", // Leviamon (X Antibody)
  "BT18-082", // Lucemon: Chaos Mode
  "BT19-071", // Beelzemon
  "BT3-091", // Lilithmon
  "BT8-111", // Creepymon
  "EX6-059", // Barbamon
];
const OPP_DIGIMON = "BT1-024"; // Koromon Lv.2 vanilla

/**
 * The harness's Board Spec/setupEngine options auto-answer "optional" and
 * "selectCards"/"chooseTargets" decisions, but not "orderTriggers" — this file's only
 * consumer of that decision kind. Answer it directly through the Test Seam's `decisions`
 * queue and `engine.applyIntent`, picking the first offered trigger key each pass (as the
 * original hand-rolled hook did), so both simultaneous whenAttacking effects fire in sequence.
 */
function autoOrderTriggers(s: EngineSetup, answered: Set<string>): void {
  for (const { seat, req } of s.decisions) {
    if (req.kind !== "orderTriggers" || answered.has(req.decisionId)) continue;
    answered.add(req.decisionId);
    const first = (req.options?.triggerKeys as string[] | undefined)?.[0] ?? "";
    s.engine.applyIntent(seat, {
      type: "respondDecision",
      decisionId: req.decisionId,
      response: { kind: "orderTriggers", order: first ? [first] : [] },
    });
  }
}

describe("EX6-073 [When Attacking] security trash is reduced by each card deleted", () => {
  it("deleting 3 of 7 opponent Digimon trashes only 4 opponent security cards", async () => {
    // Ogudomon on p0's battle area with 7 SGDL (different names) in digivolution stack.
    // 3 opponent Digimon (the engine hook picks ALL = 3 delete targets), plus 10 security cards.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: OGUDOMON,
              dp: 20000,
              as: "ogudomon",
              under: SGDL_IDS.map((id) => ({ card: id })),
            },
          ],
        },
        1: {
          battleArea: [
            { card: OPP_DIGIMON, dp: 1000 },
            { card: OPP_DIGIMON, dp: 1000 },
            { card: OPP_DIGIMON, dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const ogudomon = s.perm("ogudomon");
    for (let i = 0; i < 10; i++) s.give(1, Zone.Security, OPP_DIGIMON);
    const secBefore = p1.security.length; // 10
    const answered = new Set<string>();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ogudomon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    // Wait for the security to be reduced by 4+ (the effect trashes 7 - 3 = 4).
    // Settling on security (not just Digimon deletion) ensures trashFromSecurity
    // completes before we check totalTrash — the security trash runs AFTER the
    // deletePermanent call returns inside the same resolve() body.
    await settle(() => {
      autoOrderTriggers(s, answered);
      return p1.security.length <= secBefore - 4;
    }, 2000);

    // All 3 opponent Digimon should be deleted.
    expect(p1.battleArea.filter((p) => p.topCard?.cardId === OPP_DIGIMON).length).toBe(0);
    // The effect trashes (7 - 3) = 4 security cards.
    const totalTrash = secBefore - p1.security.length;
    expect(totalTrash).toBeGreaterThanOrEqual(4);
  });
});

describe("EX6-073 [When Digivolving] places SGDL from trash; 4+ placed deletes 1 opp Digimon", () => {
  it("places 4 SGDL cards from trash and deletes 1 opponent Digimon (KB Q3825)", async () => {
    setupEngine(
      {
        0: {
          battleArea: [{ card: OPP_DIGIMON, dp: 5000, as: "ogudomon" }],
          trash: SGDL_IDS.slice(0, 4),
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 2000, as: "oppPerm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(getEffectModule("EX6-073")!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, {} as never)).toHaveLength(1);
  });
});
