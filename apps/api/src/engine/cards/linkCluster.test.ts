import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
// Boot side-effect: self-register every compiled-IR card module (BT22-039 et al.).
import "../../cards/index.js";

/**
 * Per-cluster A3 for the Link RawUnparsed batch (plan 04-07 / CARD-01), built on the
 * `linkEligible` guard + Link primitive landed in 04-01.
 *
 * Authored faithfully (this file's full-engine A3 proves the representative one):
 *   BT22-039 Ouranosmon — [All Turns] When any of your Digimon are played, you may link
 *     1 [Appmon]-trait Digimon card from THIS Digimon's digivolution cards to 1 of your
 *     Digimon, without paying the cost. KB Q4892: the linked card must carry <Link>;
 *     Q4893: it triggers when this card itself is played. Modeled as a `whenPlayed`
 *     SubTrigger holding a `Link` action sourced from `digivolutionCards`, gated by the
 *     04-01 `linkEligible` filter inside `runLink`.
 *   BT24-079 Hadesmon — [When Digivolving] play 1 [System]/[Life] from trash, then link 1
 *     [Appmon]-trait Digimon from hand/digivolution cards; [All Turns] when other Digimon
 *     are deleted, reactivate [When Digivolving] (onDeletionOf + ReactivateEffect).
 *   BT25-089 Kazuki & Itsuki — [Main] suspend-cost link (already hand-authored as a real
 *     Link action; effects.json now matches the override so export stops double-counting it).
 *
 * Flagged missing-primitive (NOT proven here — honestly inert, see SUMMARY):
 *   BT25-045 / BT25-089 link-cost reduction (the engine <Link> is costless),
 *   BT23-024 suspend-restriction-with-superlative-exception (the `suspend` restriction is
 *     write-without-read; no "highest play cost" superlative filter exists),
 *   EX10-062 / EX10-073 trash-link-card trigger (no whenLinkTrashed engine event; EX10-073
 *     also needs a lowest-play-cost selector).
 *
 * REVERT-CONFIRM-RED lever: remove the `.filter(...linkEligible...)` wire-up from `runLink`
 * (apps/api/src/engine/effects/interpreter.ts). The negative case below (the no-<Link>
 * Appmon Digimon, BT22-016, accepted and linked) then goes RED — proving the guard, not the
 * harness, is what rejects the no-<Link> card from BT22-039's link.
 */

describe("A3 Link cluster — BT22-039 links an [Appmon] <Link> card on play, gated by linkEligible (KB Q4892)", () => {
  it("links BT21-009 (Appmon + <Link>) and REJECTS BT22-016 (Appmon, NO <Link>) from BT22-039's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // BT22-039 Ouranosmon on the field, carrying two Appmon Digimon as digivolution cards:
            //   BT21-009 Gatchmon — [Appmon] trait + <Link> (linkRequirement) -> ELIGIBLE link material
            //   BT22-016          — [Appmon] trait, NO <Link>               -> INELIGIBLE (the guard)
            // BT22-016 is placed FIRST in the stack so it is the first link candidate: without the
            // `linkEligible` guard the count:1 link would pick it, making `not.toContain("BT22-016")`
            // the live REVERT-CONFIRM-RED lever (it depends on the guard excluding it).
            { card: "BT22-039", dp: 4000, as: "ouranosmon", under: ["BT22-016", "BT21-009"] },
            // A separate friendly Digimon to RECEIVE the linked card ("link ... to 1 of your Digimon").
            { card: "BT1-009", dp: 4000, as: "recipient" },
          ],
          // The Digimon whose play arms the `whenPlayed` watcher (Q4893: even self-play triggers;
          // here a separate cheap Lv.3 is played to keep the trigger subject unambiguous).
          hand: [{ card: "BT1-009", as: "trigger" }],
        },
      },
      // The original setup() unconditionally auto-accepted every "optional" decision and
      // auto-selected every offered candidate (the Link action here is `optional: true`).
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ouranosmon = s.perm("ouranosmon");
    const trigger = s.inst("trigger");
    s.state.memory = 10; // afford the hard play

    // Install BT22-039's continuous `whenPlayed` watcher before the trigger fires.
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: trigger.instanceId }),
    ).toEqual({ ok: true });

    const linkedCardIdsNow = (): string[] => {
      const ids: string[] = [];
      for (const p of (s.state.players[0] as PlayerState).battleArea) {
        for (const c of p.linked) ids.push(c.cardId);
      }
      return ids;
    };

    await settle(() => linkedCardIdsNow().length > 0);

    const linkedCardIds = linkedCardIdsNow();

    // Positive: the <Link>-carrying Appmon card was linked.
    expect(linkedCardIds).toContain("BT21-009");
    // Negative (REVERT-CONFIRM-RED lever): the no-<Link> Appmon card was NOT linked.
    expect(linkedCardIds).not.toContain("BT22-016");
    // BT22-016 stays in BT22-039's digivolution stack, never consumed by the link.
    const stackIds: string[] = [];
    for (const c of ouranosmon.stack) stackIds.push(c.cardId);
    expect(stackIds).toContain("BT22-016");

    assertNoLoudGap(s);
  });
});
