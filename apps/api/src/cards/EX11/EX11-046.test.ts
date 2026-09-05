import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js"; // register the compiled cards so the real activateEffect path runs

/**
 * A3 for EX11-046 (Galacticmon) — the [When Digivolving] mass-delete's survivor.
 *
 *   [On Play] [When Digivolving] Choose 1 of your opponent's highest play cost
 *   Digimon and delete all of their other Digimon.
 *
 * `Target.except` narrows its own survivor pool to the opponent's HIGHEST-play-cost
 * Digimon via `selector: "highestPlayCost"` (reusing the same superlative machinery
 * `Filter.superlative` already applies elsewhere). Before this fix the interpreter
 * never read `except`, so the delete matched EVERY opponent Digimon — including the
 * one with the highest play cost that the printed text spares.
 *
 * FAILS-WHEN-REVERTED: dropping the `except` carve-out makes the highest-play-cost
 * Digimon get deleted along with the rest, and the "survives" assertion below flips.
 */

const GALACTICMON = "EX11-046";
const GALACTICMON_BASE = "BT11-111"; // Lv.6 [Galacticmon], satisfies the alternate digivolve requirement
const OPPONENT_CHEAP = "AD1-011"; // playCost 8 — must be deleted (not the highest)
const OPPONENT_COSTLY = "AD1-004"; // playCost 12 — the highest, must survive
const DECOY = "P-094"; // Destromon — Black Lv.5, NOT named [Galacticmon]

describe("EX11-046 — [When Digivolving] mass-delete spares the highest-play-cost opponent Digimon", () => {
  it("captures the official Assembly -6 recipe", () => {
    expect(runtimeCompiledCard("EX11-046")?.assemblyRequirement).toEqual([
      { reduceCost: 6, materials: [{ nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }], count: 8 }] },
    ]);
  });
  it("preserves the printed card and only its two text evolution requirements", () => {
    expect(getCardDefinition(GALACTICMON)).toMatchObject({
      nameEn: "Galacticmon",
      colors: ["Black"],
      level: 6,
      playCost: 14,
      dp: 14000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 6 }],
      types: ["Unknown", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(GALACTICMON)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Snatchmon"], cost: 9, isAlternate: true },
      { namesExact: ["Galacticmon"], cost: 5, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(GALACTICMON)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects.find(({ trigger }) => trigger === "EndOfOpponentsTurn")?.actions).toMatchObject([
      {
        kind: "Digivolve",
        into: { nameOrTrait: [{ tokens: ["Galacticmon"], match: "nameExact" }] },
        from: ["hand", "trash"],
        payCost: false,
        ignoreRequirements: true,
        optional: true,
      },
    ]);
  });

  it("keeps the highest-play-cost opponent Digimon, deletes the rest", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON_BASE, as: "base" }],
          hand: [{ card: GALACTICMON, as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: OPPONENT_CHEAP, as: "cheap" },
            { card: OPPONENT_COSTLY, as: "costly" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    const base = s.perm("base");
    const cheap = s.perm("cheap");
    const costly = s.perm("costly");
    const evolving = s.inst("evolving");

    s.engine.applyIntent(0, { type: "digivolve", permanentId: base.permanentId, instanceId: evolving.instanceId });

    await settle(() => s.state.players[1]!.battleArea.length === 1);

    // The highest-play-cost opponent Digimon survives ...
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === costly.permanentId)).toBe(true);
    // ... while the cheaper one was deleted.
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === cheap.permanentId)).toBe(false);
  });

  /** Boundary: 3 Vemmon is one short — neither Blocker nor the immunity is granted. */
  it("grants nothing when the evolving Digimon has only 3 Vemmon in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALACTICMON_BASE, as: "base", under: ["BT11-061", "BT11-061", "BT11-061"] }],
          hand: [{ card: GALACTICMON, as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    const base = s.perm("base");
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("evolving").instanceId,
    });
    await settle(() => base.topCard?.cardId === GALACTICMON);
    expect(observe(s.engine).hasKeyword(base, "Blocker")).toBe(false);
    assertNoLoudGap(s);
  });

  it("grants Blocker when the evolving Digimon has at least 4 Vemmon in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: GALACTICMON_BASE,
              as: "base",
              under: ["BT11-061", "BT11-061", "BT11-061", "BT11-061"],
            },
          ],
          hand: [{ card: GALACTICMON, as: "evolving" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    const base = s.perm("base");
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("evolving").instanceId,
    });
    await settle(() => observe(s.engine).hasKeyword(base, "Blocker"));

    expect(base.topCard?.cardId).toBe(GALACTICMON);
    expect(base.stack.filter((card) => card.cardId === "BT11-061")).toHaveLength(4);
    expect(observe(s.engine).hasKeyword(base, "Blocker")).toBe(true);
    // "isn't affected by THEIR effects": GrantImmunity requires `immuneFrom` — without it the
    // action is not assignable to Action at all, and the printed scope is unstated.
    expect(runtimeCompiledCard(GALACTICMON)?.effects[1]?.actions[2]).toMatchObject({
      kind: "GrantImmunity",
      immuneFrom: "opponentEffects",
      duration: "untilOpponentTurnEnd",
      target: { filter: { isSelfRef: true }, isSelf: true },
      condition: { kind: "digivolutionCardCount", op: "gte", value: 4, nameOrTrait: [{ tokens: ["Vemmon"] }] },
    });
    assertNoLoudGap(s);
  });

  /**
   * FAILS-WHEN-REVERTED: the [End of Opponent's Turn] destination was encoded as
   * `into: { namesExact: ["Galacticmon"] }`, and `names` is not a Filter field — the interpreter
   * ignored it and offered every card in hand and trash (Snatchmon, Destromon, ...).
   */
  it("only digivolves into a card named [Galacticmon] at the end of the opponent's turn", async () => {
    const withHand = (hand: string) =>
      setupEngine(
        { 0: { battleArea: [{ card: GALACTICMON, as: "self" }], hand: [{ card: hand, as: "candidate" }] } },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );

    const decoy = withHand(DECOY);
    decoy.state.turnSeat = 1;
    await advance(decoy.engine).runTurn(1);
    expect(decoy.perm("self").topCard?.cardId).toBe(GALACTICMON);
    expect(decoy.state.players[0]!.hand.map((card) => card.cardId)).toContain(DECOY);

    const named = withHand(GALACTICMON_BASE);
    named.state.turnSeat = 1;
    await advance(named.engine).runTurn(1);
    expect(named.perm("self").topCard?.cardId).toBe(GALACTICMON_BASE);
  });

  /**
   * The printed source is "in the hand OR trash". FAILS-WHEN-REVERTED: dropping "trash" from
   * `from` leaves nothing to digivolve into and the top card stays EX11-046.
   */
  it("also digivolves into a [Galacticmon] sitting in the TRASH, and only into that name", async () => {
    const withTrash = (trashCard: string) =>
      setupEngine(
        { 0: { battleArea: [{ card: GALACTICMON, as: "self" }], trash: [trashCard] } },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );

    const decoy = withTrash(DECOY);
    decoy.state.turnSeat = 1;
    await advance(decoy.engine).runTurn(1);
    expect(decoy.perm("self").topCard?.cardId).toBe(GALACTICMON);
    expect(decoy.state.players[0]!.trash.map(({ cardId: id }) => id)).toContain(DECOY);

    const named = withTrash(GALACTICMON_BASE);
    named.state.turnSeat = 1;
    await advance(named.engine).runTurn(1);
    expect(named.perm("self").topCard?.cardId).toBe(GALACTICMON_BASE);
    expect(named.perm("self").stack.map(({ cardId: id }) => id)).toEqual([GALACTICMON]);
  });
});
