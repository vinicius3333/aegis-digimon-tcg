import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js"; // register the BT20 compiled cards so the real activateEffect path runs
import { compiled } from "./BT20-102.js";

/**
 * A3 for BT20-102 (Omnimon (X Antibody)) — the [When Digivolving] mass-delete's survivor.
 *
 *   [On Play] [When Digivolving] If [Omnimon]/[X Antibody] is in this Digimon's
 *   digivolution cards, choose 1 of both players' Digimon and delete all OTHER
 *   Digimon. Then, return 1 of your opponent's Digimon to the bottom of the deck.
 *
 * `Target.except` (a nested `{ filter, count, selector }`) is meant to carve the
 * chosen survivor out of the `count: "all"` delete. Before this fix the interpreter
 * never read `except`, so the delete matched every Digimon on the board with no
 * survivor at all — including the Digimon that just digivolved into BT20-102 itself.
 *
 * FAILS-WHEN-REVERTED: dropping the `except` carve-out (via `resolveExceptSurvivors`
 * in the interpreter) makes the chosen survivor get deleted along with everything
 * else, and the "still on the board" assertion below flips to false.
 */

const OMNIMON_XA = "BT20-102";
const OMNIMON_BASE = "BT5-086"; // Lv.7 [Omnimon], satisfies the "[Omnimon]" alternate digivolve requirement
const OWN_OTHER = "AD1-011"; // an unrelated own Digimon, must be deleted (not the chosen survivor)
const OPPONENT_DIGIMON = "AD1-004"; // an unrelated opponent Digimon, must be deleted

describe("BT20-102 — [When Digivolving] mass-delete spares the chosen survivor (Target.except)", () => {
  it("grants Rush and then offers the same Digimon an unsuspending attack", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Attack",
          target: { sameTarget: true },
          withoutSuspending: true,
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    });
  });

  it("checks exact Omnimon or X Antibody trait in both entry timings and the alternate route", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const entryEffect = compiled.effects.find((entry) => entry.trigger === trigger);

      expect(entryEffect?.actions[0]).toMatchObject({
        condition: {
          kind: "selfDigivolutionStackHasTrait",
          filter: {
            nameOrTrait: [
              { tokens: ["Omnimon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "trait" },
            ],
          },
        },
      });
    }

    expect(compiled.digivolutionRequirement).toContainEqual({
      namesExact: ["Omnimon"],
      cost: 2,
      isAlternate: true,
    });
  });

  it("keeps the chosen survivor (itself) while deleting every other Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: OMNIMON_BASE, as: "base" },
            { card: OWN_OTHER, as: "ownOther" },
          ],
          hand: [{ card: OMNIMON_XA, as: "evolving" }],
        },
        1: {
          battleArea: [{ card: OPPONENT_DIGIMON, as: "oppOther" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    s.state.memory = 10;

    const base = s.perm("base");
    const ownOther = s.perm("ownOther");
    const oppOther = s.perm("oppOther");
    const evolving = s.inst("evolving");

    // Bias the "choose 1 of both players' Digimon" prompt toward sparing the digivolved
    // permanent itself.
    preferInstanceIds.push(base.permanentId);

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });

    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea.length === 1);

    // The chosen survivor (this Digimon itself) is still on the board ...
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === base.permanentId)).toBe(true);
    // ... while every OTHER Digimon on either side was deleted.
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === ownOther.permanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === oppOther.permanentId)).toBe(false);
  });
});
