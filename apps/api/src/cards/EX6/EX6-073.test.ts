import { describe, it, expect } from "vitest";
import { EffectTiming, PlayerState, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { candidateLooseInstances, pickLoose } from "../../engine/effects/interpreter/targeting/loose.js";
import { compiled } from "./EX6-073.js";
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
            { card: OPP_DIGIMON, dp: 1000, suspended: true, as: "oppOne" },
            { card: OPP_DIGIMON, dp: 1000, as: "oppTwo" },
            { card: OPP_DIGIMON, dp: 1000, as: "oppThree" },
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
        // Attack a permanent rather than the player: this isolates the effect's security
        // trash from battle-security checks, so the Q3827 value is exact.
        target: { kind: "permanent", permanentId: s.perm("oppOne").permanentId },
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
    expect(totalTrash).toBe(4);
  });
});

describe("EX6-073 [When Digivolving] places SGDL from trash; 4+ placed deletes 1 opp Digimon", () => {
  it("places 4 SGDL cards from trash and deletes 1 opponent Digimon (KB Q3825)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: OGUDOMON, dp: 16000, as: "ogudomon" }],
          trash: SGDL_IDS.slice(0, 4),
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 2000, as: "oppPerm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ogudomon"));
    await settle(() => s.perm("ogudomon").stack.length === 4);

    expect(s.perm("ogudomon").stack).toHaveLength(4);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === OPP_DIGIMON)).toBe(false);
  });
});

describe("EX6-073 activation-local distinct-name contracts", () => {
  it("requires distinct names for placement and an exact self-stack seven-card payment", () => {
    const placements =
      compiled.effects?.flatMap((effect) => effect.actions ?? []).filter((action) => action.kind === "PlaceUnder") ??
      [];
    const paidDelete = compiled.effects
      ?.flatMap((effect) => effect.actions ?? [])
      .find((action) => action.kind === "Delete" && action.cost?.kind === "return");

    expect(placements).toHaveLength(2);
    for (const placement of placements) {
      expect(placement).toMatchObject({
        target: { count: 7, upTo: true, distinctNames: true },
        trackCount: "ex6-073-placed",
        trackDistinctNames: "ex6-073-placed",
      });
    }
    expect(paidDelete).toMatchObject({
      optional: true,
      abortOnDecline: true,
      target: {
        count: 7,
        filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
      },
      cost: {
        kind: "return",
        position: "bottom",
        target: {
          count: 7,
          isSelfRef: true,
          distinctNames: true,
          filter: { zone: "digivolutionCards", sameHost: true },
        },
      },
      trackCount: "ex6-073-deleted",
    });

    const securityTrash = compiled.effects
      ?.flatMap((effect) => effect.actions ?? [])
      .find((action) => action.kind === "SecurityManipulation" && action.op === "trashTop");
    expect(securityTrash).toMatchObject({
      controller: "opponent",
      amountFromNamedCount: { base: 7, countSource: "ex6-073-deleted", per: -1, floor: 0 },
    });
  });

  it("resolves only this Digimon's stack and deduplicates a hostile duplicate-name selection", async () => {
    const self = {
      permanentId: "ogudomon-host",
      stack: [
        { instanceId: "self-a", cardId: "A", ownerSeat: 0, faceUp: true },
        { instanceId: "self-b", cardId: "B", ownerSeat: 0, faceUp: true },
      ],
      linked: [],
      topCard: { instanceId: "ogudomon-top", cardId: OGUDOMON, ownerSeat: 0 },
    };
    const unrelated = {
      permanentId: "other-host",
      stack: [{ instanceId: "other-a", cardId: "C", ownerSeat: 0, faceUp: true }],
      linked: [],
      topCard: { instanceId: "other-top", cardId: OPP_DIGIMON, ownerSeat: 0 },
    };
    const names: Record<string, string> = { A: "Belphemon", B: "Leviamon", C: "Lilithmon", D: "Belphemon" };
    const ctx = {
      source: { ownerSeat: 0, instanceId: "ogudomon-top", permanent: () => self },
      game: {
        player: (seat: number) => ({
          hand: [],
          trash: [],
          deck: [],
          security: [],
          battleArea: seat === 0 ? [self, unrelated] : [],
          breeding: undefined,
        }),
        opponentOf: () => 1,
        definitionOf: ({ cardId }: { cardId: string }) => ({
          cardId,
          nameEn: names[cardId] ?? cardId,
          kinds: [],
          colors: [],
          types: ["Seven Great Demon Lords"],
          playCost: 0,
        }),
      },
    } as never;
    const target = {
      filter: { controller: "mine", zone: "digivolutionCards", isSelfRef: true },
      count: 7,
    } as never;

    const selfStack = candidateLooseInstances(ctx, target, ["digivolutionCards"]);
    expect(selfStack.map((card) => card.instanceId)).toEqual(["self-a", "self-b"]);

    const deduped = await pickLoose(
      ctx,
      { filter: { distinctNames: true }, count: 2, upTo: true } as never,
      [...selfStack, { instanceId: "duplicate-a", cardId: "D", ownerSeat: 0 }],
      undefined,
      { selectCards: async () => ["self-a", "duplicate-a"] } as never,
    );
    expect(deduped).toEqual(["self-a"]);
  });

  it("keeps ordinary self references scoped to the source loose card outside hosted zones", () => {
    const sourceCard = { instanceId: "source-in-hand", cardId: "A", ownerSeat: 0 };
    const otherCard = { instanceId: "other-in-hand", cardId: "B", ownerSeat: 0 };
    const ctx = {
      source: { ownerSeat: 0, instanceId: sourceCard.instanceId, permanent: () => undefined },
      game: {
        player: (seat: number) => ({
          hand: seat === 0 ? [sourceCard, otherCard] : [],
          trash: [],
          deck: [],
          security: [],
          battleArea: [],
          breeding: undefined,
        }),
        opponentOf: () => 1,
        definitionOf: ({ cardId }: { cardId: string }) => ({
          cardId,
          nameEn: cardId,
          kinds: [],
          colors: [],
          playCost: 0,
        }),
      },
    } as never;

    const resolved = candidateLooseInstances(
      ctx,
      { filter: { controller: "mine", zone: "hand", isSelfRef: true }, count: 1 } as never,
      ["hand"],
    );
    expect(resolved.map((card) => card.instanceId)).toEqual(["source-in-hand"]);
  });
});
