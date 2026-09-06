import { EffectTiming } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
          kind: "selfDigivolutionStackMatchesFilter",
          filter: {
            nameOrTrait: [
              { tokens: ["Omnimon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "nameExact" },
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
    preferInstanceIds.push(base.topCard.instanceId);

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });

    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[0]!.battleArea.length === 1);

    // The chosen survivor (this Digimon itself) is still on the board ...
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === base.permanentId)).toBe(true);
    // ... while every OTHER Digimon on either side was deleted.
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === ownOther.permanentId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === oppOther.permanentId)).toBe(false);
  });

  it("does not fire the entry mass-delete from an X Antibody trait-only Digimon in the stack", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: OMNIMON_XA, as: "xOnly", under: ["BT9-008", "BT15-009", "BT20-014", "BT20-018"] },
            { card: OWN_OTHER, as: "ownOther" },
          ],
        },
        1: { battleArea: [{ card: OPPONENT_DIGIMON, as: "oppOther" }] },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("xOnly").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("xOnly"));
    await settle(
      () => s.state.players[0]!.battleArea.length === 2 && s.state.players[1]!.deck.at(-1)?.cardId === OPPONENT_DIGIMON,
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain(OMNIMON_XA);
  });

  it.each([
    ["trait-only X Antibody Digimon", "BT9-008", false],
    ["exact X Antibody Option", "BT9-109", true],
    ["Proto Form Rule Name", "EX5-070", true],
  ] as const)("uses exact bracket-name semantics for %s in the stack", async (_label, sourceCard, qualifies) => {
    const stackSources =
      sourceCard === "BT9-008" ? ["BT9-008", "BT15-009", "BT20-014"] : [sourceCard, "BT20-008", "BT15-009", "BT20-014"];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-018", as: "base", under: stackSources },
            { card: OWN_OTHER, as: "ownOther" },
          ],
          hand: [{ card: OMNIMON_XA, as: "evolving" }],
        },
        1: { battleArea: [{ card: OPPONENT_DIGIMON, as: "oppOther" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === OMNIMON_XA);
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(qualifies ? 1 : 2);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === OWN_OTHER)).toBe(!qualifies);
  });

  it("does not mass-delete when neither Omnimon nor X Antibody is in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: OMNIMON_XA, as: "unqualified", under: ["BT1-010"] },
            { card: OWN_OTHER, as: "ownOther" },
          ],
        },
        1: { battleArea: [{ card: OPPONENT_DIGIMON, as: "oppOther" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("unqualified"));
    await settle(() => s.state.players[1]!.deck.some((card) => card.cardId === OPPONENT_DIGIMON));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(
      expect.arrayContaining([OMNIMON_XA, OWN_OTHER]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe(OPPONENT_DIGIMON);
  });

  it("grants Rush and attacks without suspending at the end of your turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: OMNIMON_XA, as: "omnimon" }] },
        1: { security: ["BT1-010"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.EndOfYourTurn, s.perm("omnimon"));
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(observe(s.engine).hasAttackedThisTurn(s.perm("omnimon"))).toBe(true);
    expect(s.perm("omnimon").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
