import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
// A per-card test loads only its own module, so the cross-card name proof needs the peer's
// module imported for its side effect (see docs/audits/EX13-authoring/REVIEW-NOTES.md).
import "../BT13/BT13-074.js";
import { compiled } from "./EX13-053.js";

/**
 * EX13-053 Thundermon. `node tools/kb/query.mjs card EX13-053` reports no knowledge-base
 * entries — EX13 is pre-release — so every assertion is anchored on the printed catalog text
 * and on `data/kb/rules/comprehensive.md`: §4-22-1 (a token "in its text"), §16-12-1
 * (＜De-Digivolve＞), §15-7 / §15-7-2 (optional processing conditions, which this card's "You
 * may" sentence is NOT), and §2-3-1 / §4-22 (card names, rewritten by the [Rule] clause).
 */
const cardId = "EX13-053";

// --- [Mamemon]-text fixtures -------------------------------------------------------------------
// BT6-064 "Mamemon"        — Digimon, the token in its NAME (so also in its text).
// EX13-046 "Kokuwamon"     — Digimon whose ONLY [Mamemon] mention sits inside its printed
//                            effect text, with no name rewrite: the fixture that separates
//                            `match: "text"` from `match: "name"`. BT8-061 Thundermon is NOT
//                            usable here — its printed "also treated as [Mamemon]" line is
//                            folded into the card's names by `effectiveStaticNames`, so a
//                            `match: "name"` filter already reaches it.
// BT3-071 "MetalMamemon"   — Digimon, token in its name; the third return slot.
// BT8-106 "Senbon Dokkān"  — OPTION naming [Mamemon] in its text: the `kind: ["Digimon"]`
//                            discriminator, matching the text reference but not the card kind.
// BT12-058 "Zenimon"       — Black Lv.3 Digimon with the [Mutant] trait and NO [Mamemon]
//                            anywhere: the near-miss that shares this card's archetype.
const MAMEMON_NAME = "BT6-064";
const MAMEMON_TEXT_ONLY = "EX13-046";
const METAL_MAMEMON = "BT3-071";
const MAMEMON_TEXT_OPTION = "BT8-106";
const MUTANT_NO_MAMEMON = "BT12-058";

// --- Opponent bodies, all with no printed text of their own ------------------------------------
const PC3 = "BT1-012"; // Biyomon, Red Lv.3 2000 DP, play cost 3 — at the printed maximum.
const PC4 = "BT7-020"; // Shellmon, Blue Lv.4 6000 DP, play cost 4 — one over the printed maximum.
const PC5 = "BT1-038"; // Monzaemon, Blue Lv.5 6000 DP, play cost 5.
const PC6 = "BT1-037"; // Gorillamon, Blue Lv.4 6000 DP, play cost 6.
const PC7 = "BT1-024"; // MetalTyrannomon, Red Lv.5 10000 DP, play cost 7 — above every reachable cap.

// --- Evolution fixtures (no printed text of their own) -----------------------------------------
const BLACK_LV3 = "BT3-060"; // Psychemon, Black Lv.3 5000 DP — the first printed route.
const YELLOW_LV3 = "BT3-032"; // Armadillomon, Yellow Lv.3 4000 DP — the second printed route.
const RED_LV3 = "BT1-009"; // Monodramon, Red Lv.3 — right level, wrong colour.
const BLACK_LV4 = "BT10-062"; // Golemon, Black Lv.4 — right colour, wrong level.
// Brachiomon, Black Lv.5 with no printed text: a host whose own deletion adds no [On Deletion]
// body of its own (BT6-064 Mamemon prints "delete 1 of your opponent's Digimon with a play cost
// of 7 or less", which would eat the de-digivolve subject and blur what this proof isolates).
const BLACK_LV5_VANILLA = "BT10-022";

// --- Neutral fixtures --------------------------------------------------------------------------
const SENTINEL = "BT1-009"; // Monodramon, Red Lv.3 3000 DP, no printed text.
const SPARE = "BT1-014"; // Kokatorimon, Red Lv.4, no printed text — keeps Main from auto-passing.
const PRINCE_MAMEMON = "BT13-074"; // Its [All Turns] aura keys on "[Mamemon] in their names".

const DECK = [SENTINEL, SENTINEL, SENTINEL];

describe("EX13-053 Thundermon", () => {
  it("matches the catalog printing and the complete IR contract", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "EX13",
      nameEn: "Thundermon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Mutant"],
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 2 },
        { color: "Yellow", level: 3, memoryCost: 2 },
      ],
      effectText:
        "[On Play] [On Deletion] You may return up to 3 Digimon cards with [Mamemon] in their texts from your trash to the top of the deck. Then, delete 1 of your opponent's Digimon with a play cost of 3 or less. For each one this effect returned, add 1 to this effect's play cost maximum.\n[Rule] Name: Treated as including [Mamemon].",
      inheritedEffectText: "[On Deletion] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. ",
    });

    const body = [
      {
        kind: "Return",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Mamemon"], match: "text" }],
          },
          count: 3,
          upTo: true,
        },
        from: ["trash"],
        to: "deckTop",
        optional: true,
        trackCount: "mamemonTextCardsReturned",
      },
      {
        kind: "Delete",
        target: {
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
            playCostLte: 3,
            playCostLteScaling: { per: 1, unit: "namedCount", countSource: "mamemonTextCardsReturned" },
          },
          count: 1,
        },
      },
    ];

    expect(compiled.effects[0]).toEqual({ trigger: "OnPlay", actions: body });
    expect(compiled.effects[1]).toEqual({ trigger: "OnDeletion", actions: body });
    expect(compiled.effects[2]).toEqual({
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "name",
          tokens: ["Mamemon"],
        },
      ],
    });
    expect(compiled.effects[3]).toEqual({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
    });
    expect(compiled.effects).toHaveLength(4);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [On Play] — the unraised printed maximum of 3.
  // ---------------------------------------------------------------------------

  it("deletes at the printed maximum of 3 and spares play cost 4 when nothing is returned", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          // The trash holds only cards the return filter rejects, so no return is offered at
          // all and the ceiling stays at its printed 3.
          trash: [
            { card: MAMEMON_TEXT_OPTION, as: "optionText" },
            { card: MUTANT_NO_MAMEMON, as: "noMamemon" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: PC3, as: "victim" },
            { card: PC4, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([PC4]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    // Neither rejected trash card moved: the Option matches "[Mamemon] in its text" but not
    // "Digimon cards", and Zenimon matches the archetype but prints no [Mamemon].
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("optionText").instanceId,
      s.inst("noMamemon").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(DECK.length);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("leaves play cost 4 alive when the only opponent Digimon is over the unraised maximum", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          deck: DECK,
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: PC4, as: "survivor" }],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [On Play] — the returned cards raise the maximum by one each.
  // ---------------------------------------------------------------------------

  it("returns 3 [Mamemon]-text Digimon to the deck top and deletes at a maximum of 6", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          trash: [
            { card: MAMEMON_NAME, as: "mamemon" },
            { card: MAMEMON_TEXT_ONLY, as: "textOnly" },
            { card: METAL_MAMEMON, as: "metalMamemon" },
            { card: MAMEMON_TEXT_OPTION, as: "optionText" },
            { card: MUTANT_NO_MAMEMON, as: "noMamemon" },
          ],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: PC6, as: "victim" },
            { card: PC7, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 4);
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    // All three Digimon matches left the trash for the top of the deck; the Option and the
    // [Mamemon]-less Digimon stayed behind.
    expect(
      s.state.players[0]!.deck.slice(0, 3)
        .map(({ instanceId }) => instanceId)
        .sort(),
    ).toEqual([s.inst("mamemon").instanceId, s.inst("textOnly").instanceId, s.inst("metalMamemon").instanceId].sort());
    expect(s.state.players[0]!.deck[3]!.instanceId).toBe(s.inst("deckFloor").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("optionText").instanceId,
      s.inst("noMamemon").instanceId,
    ]);
    // 3 + 3 returned = a play-cost maximum of 6: Gorillamon (6) dies, MetalTyrannomon (7) lives.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("raises the maximum by exactly the number returned when only 1 card is chosen", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          trash: [
            { card: MAMEMON_NAME, as: "returned" },
            { card: METAL_MAMEMON, as: "leftBehind" },
            { card: MAMEMON_TEXT_ONLY, as: "alsoLeftBehind" },
          ],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: PC4, as: "victim" },
            { card: PC5, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      // No `autoSelectCards`: the "up to 3" selection is answered by hand so the returned count
      // is exactly 1 and the raised ceiling can be pinned at 3 + 1.
      { autoAcceptOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds?: string[]; min?: number };
    expect([...(payload.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.inst("returned").instanceId, s.inst("leftBehind").instanceId, s.inst("alsoLeftBehind").instanceId].sort(),
    );
    // "up to 3" reaches the controller as a selection that accepts fewer than three cards.
    expect(payload.min ?? 0).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("returned").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("returned").instanceId,
      s.inst("deckFloor").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("leftBehind").instanceId,
      s.inst("alsoLeftBehind").instanceId,
    ]);
    // 3 + 1 returned = 4: Shellmon (4) dies, Monzaemon (5) lives. Returning all three would
    // have reached 6 and killed both.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("still deletes at the printed maximum when the printed 'You may' is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          trash: [
            { card: MAMEMON_NAME, as: "kept" },
            { card: METAL_MAMEMON, as: "alsoKept" },
          ],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: PC3, as: "victim" },
            { card: PC4, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    // Nothing returned, so the maximum stays 3 — the clause after the "may" is not gated on it
    // (comprehensive rules §15-7-2 governs "by X, Y" costs, which this sentence is not).
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("kept").instanceId,
      s.inst("alsoKept").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("deckFloor").instanceId]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("never reaches the opponent's trash: only the controller's own trash feeds the return", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: PC3, as: "victim" }],
          trash: [
            { card: MAMEMON_NAME, as: "theirMamemon" },
            { card: METAL_MAMEMON, as: "theirMetalMamemon" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thunder").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("theirMamemon").instanceId,
      s.inst("theirMetalMamemon").instanceId,
      s.inst("victim").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("deckFloor").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] — the same body off the board.
  // ---------------------------------------------------------------------------

  it("runs the same return-and-delete body when it is deleted from the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "thunder" }],
          trash: [
            { card: MAMEMON_NAME, as: "mamemon" },
            { card: MAMEMON_TEXT_ONLY, as: "textOnly" },
          ],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          battleArea: [
            { card: PC6, as: "victim" },
            { card: PC7, as: "survivor" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("thunder").permanentId], "byEffect");
    expect(await deletion).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    // [On Deletion] resolves with this card already in the trash, and EX13-053 prints
    // [Mamemon] in its own text, so it is itself a legal return target: all THREE Digimon in
    // the trash go back on top of the deck and the trash empties.
    expect(
      s.state.players[0]!.deck.map(({ instanceId }) => instanceId)
        .slice(0, 3)
        .sort(),
    ).toEqual([s.inst("mamemon").instanceId, s.inst("textOnly").instanceId, s.inst("thunder").instanceId].sort());
    expect(s.state.players[0]!.deck[3]!.instanceId).toBe(s.inst("deckFloor").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    // 3 + 3 returned = 6: Gorillamon (6) dies, MetalTyrannomon (7) lives.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("survivor").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // Inherited [On Deletion] ＜De-Digivolve 1＞ — comprehensive rules §16-12-1.
  // ---------------------------------------------------------------------------

  it("de-digivolves 1 opponent Digimon from under a host, without running its own main body", async () => {
    const s = setupEngine(
      {
        0: {
          // The smallest legal stack that reaches this card as a digivolution card: a Black
          // Lv.5 host sitting on EX13-053, which sits on the Black Lv.3 its catalog route names.
          battleArea: [
            {
              card: BLACK_LV5_VANILLA,
              as: "host",
              under: [
                { card: BLACK_LV3, as: "base" },
                { card: cardId, as: "thunder" },
              ],
            },
          ],
          trash: [{ card: METAL_MAMEMON, as: "untouched" }],
          deck: [{ card: SENTINEL, as: "deckFloor" }],
          security: [SENTINEL],
        },
        1: {
          // The de-digivolve subject carries a Lv.4 top over a Lv.3 source, so peeling one card
          // is observable: `peelStackTops` has a level-3 floor.
          battleArea: [{ card: PC4, as: "subject", under: [{ card: PC3, as: "promoted" }] }],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("base").instanceId,
      s.inst("thunder").instanceId,
    ]);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(await deletion).toBe(1);
    // Keep the resolution-source window open until the reactive De-Digivolve effect
    // (fired asynchronously by the deletion, not inline within `deletion`) has settled —
    // closing it early races the reactive processing and can corrupt its target selection.
    await settle(() => s.perm("subject").topCard.cardId === PC3);
    await settle();
    advance(s.engine).verb.leaveEffectResolution();

    // ＜De-Digivolve 1＞ trashed the top card and promoted the source beneath it.
    expect(s.perm("subject").topCard.instanceId).toBe(s.inst("promoted").instanceId);
    expect(s.perm("subject").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("subject").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    // The main [On Deletion] body belongs to the top card, not to a digivolution card: nothing
    // left the controller's trash and no opponent Digimon was deleted.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [
        s.inst("untouched").instanceId,
        s.inst("host").instanceId,
        s.inst("base").instanceId,
        s.inst("thunder").instanceId,
      ].sort(),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("deckFloor").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [Rule] Name: Treated as including [Mamemon].
  // ---------------------------------------------------------------------------

  it("is treated as including [Mamemon], so another card's [Mamemon]-name aura reaches it", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: PRINCE_MAMEMON, as: "prince" },
          { card: cardId, as: "thunder" },
          { card: MUTANT_NO_MAMEMON, as: "zenimon" },
        ],
        deck: DECK,
        security: [SENTINEL],
      },
      1: { deck: DECK, security: [SENTINEL] },
    });
    await s.ready();

    expect(observe(s.engine).grantedNames(s.perm("thunder"))).toContain("mamemon");
    expect(observe(s.engine).effectiveNames(s.perm("thunder"))).toEqual(
      expect.arrayContaining(["thundermon", "mamemon"]),
    );
    // BT13-074's [All Turns] aura grants ＜Jamming＞/＜Reboot＞ to "all of your Digimon with
    // [Mamemon] in their names". It discriminates: the granted name pulls EX13-053 in, while
    // Zenimon — same [Mutant] archetype, no [Mamemon] — stays out.
    expect(observe(s.engine).hasKeyword(s.perm("thunder"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("thunder"), "Reboot")).toBe(true);
    expect(observe(s.engine).grantedNames(s.perm("zenimon"))).not.toContain("mamemon");
    expect(observe(s.engine).hasKeyword(s.perm("zenimon"), "Jamming")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("zenimon"), "Reboot")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Evolution routes — both printed catalog EvoCosts, plus illegal sources.
  // ---------------------------------------------------------------------------

  it("digivolves from a Black Lv.3 for 2 on the first printed route, without firing [On Play]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: BLACK_LV3, as: "base" }],
          hand: [
            { card: cardId, as: "thunder" },
            { card: SPARE, as: "spareHand" },
          ],
          trash: [{ card: MAMEMON_NAME, as: "untouched" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: PC3, as: "untouchedVictim" }],
          deck: DECK,
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("thunder").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("bonusDraw").instanceId, s.inst("spareHand").instanceId].sort(),
    );
    // Digivolving is not playing: the [On Play] body never ran.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("untouchedVictim").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("digivolves from a Yellow Lv.3 for 2 on the second printed route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YELLOW_LV3, as: "base" }],
          hand: [{ card: cardId, as: "thunder" }, SPARE],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("thunder").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a Lv.3 of the wrong colour and a Lv.4 of the right colour", async () => {
    for (const source of [RED_LV3, BLACK_LV4]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: source, as: "base" }],
          hand: [{ card: cardId, as: "thunder" }],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { deck: DECK, security: [SENTINEL] },
      });
      s.state.memory = 10;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("thunder").instanceId,
          useAlternateCost: false,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      expect(s.perm("base").topCard.cardId).toBe(source);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("thunder").instanceId]);
      // The memory clamp is ±10, so a refused digivolve leaves the gauge exactly where it was.
      expect(s.state.memory).toBe(10);
    }
  });
});
