import { assemblyRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-031.js";

/**
 * EX13-031 KingSukamon. `node tools/kb/query.mjs card EX13-031` reports no knowledge-base
 * entries — EX13 is pre-release — so every assertion is anchored on the printed catalog text and
 * on `data/kb/rules/comprehensive.md`: §7-3 / §7-3-1 / §7-3-2-6 (Assembly, materials come from the
 * trash and stack left-to-right), §15-7 (optional processing conditions, "by X, Y"), §15-12-2
 * (effects that change information — whose own worked example is this card's rewrite), and
 * §4-22-1 / §2-3-1 (card names).
 */
const cardId = "EX13-031";

// --- [Sukamon]/[Chuumon] name-reference fixtures -----------------------------------------------
// BT14-034 "Sukamon"         — exact token, Yellow/Black Lv.4 cost 3. The ONLY Sukamon-named
//                              Digimon with no battle-area effect at all (its printed line is a
//                              [Security] effect), so deleting it never competes with the clause
//                              under test.
// BT13-065 "PlatinumSukamon" — SUBSTRING match, Lv.4. Proves the name reference is not exact.
// BT13-069 "KingSukamon"     — substring match but Lv.5 and play cost 6: the level/cost near-miss.
// BT3-061  "Chuumon"         — the second cost token; Black Lv.3 cost 3, no [Sukamon] in its name.
// BT13-062 "Chuumon"         — Black Lv.3 cost 3, the free-play target. Its [On Play] needs a
//                              [Sukamon]/[Etemon]-named card in hand, so it is inert here.
// BT11-063 "Geremon"         — the near-match: prints [Sukamon] in its TEXT, never in its name.
const SUKAMON = "BT14-034";
const PLATINUM_SUKAMON = "BT13-065";
const KING_SUKAMON_LV5 = "BT13-069";
const CHUUMON_COST_3 = "BT3-061";
const CHUUMON_PLAYABLE = "BT13-062";
const TEXT_ONLY_SUKAMON = "BT11-063";

// --- Evolution-source fixtures (no printed text of their own) ----------------------------------
const YELLOW_LV4 = "BT3-037"; // Turuiemon, Yellow Lv.4 — the printed Yellow route.
// The Black Lv.4 route uses PLATINUM_SUKAMON (BT13-065), a Black Lv.4 of this same archetype.
const YELLOW_LV3 = "BT1-045"; // Tsukaimon, Yellow Lv.3 — right colour, wrong level.
const YELLOW_LV6 = "ST3-10"; // Magnadramon, Yellow Lv.6 from a Yellow Lv.5 for 2 — no printed text.
const GREEN_LV4 = "BT1-071"; // Vegiemon, Green Lv.4 — right level, wrong colour.

// --- Neutral fixtures -------------------------------------------------------------------------
const SENTINEL = "BT1-009"; // Monodramon, Red Lv.3 3000 DP, no printed text.
const NEUTRAL_LV3 = "BT1-013"; // Muchomon, Red Lv.3 5000 DP, no printed text.
const SPARE = "BT1-014"; // Kokatorimon, Red Lv.4, no printed text — keeps Main from auto-passing.
const OPPONENT_BODY = "ST15-11"; // MetalGreymon, Black Lv.5 8000 DP — the rewrite subject.

describe("EX13-031 KingSukamon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "KingSukamon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Mutant"],
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 3 },
        { color: "Black", level: 4, memoryCost: 3 },
      ],
      effectText:
        "[Assembly -4] 3 Lv.4 or lower Digimon cards w/[Sukamon] in name\n\n[On Play] [When Digivolving] [On Deletion] By trashing 1 card with [Chuumon] or [Sukamon] in its name from your hand or your Digimon's digivolution cards, you may change the base name, color and DP of 1 of your opponent’s Digimon to [Sukamon], white and 3000 until their turn ends.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When any other Digimon with [Sukamon] in their names are deleted, reveal the top 3 cards of your deck. You may play 1 play cost 3 or lower Digimon card with [Chuumon] or [Sukamon] in its name among them without paying the cost. trash the rest.",
    });
  });

  it("compiles every printed clause and nothing else", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    // Both printed EvoCosts are carried by the catalog; the card prints no [Digivolve] header.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "OnPlay",
      "WhenDigivolving",
      "OnDeletion",
      "AllTurns",
    ]);

    // [Assembly -4] 3 Lv.4 or lower Digimon cards w/[Sukamon] in name.
    expect(assemblyRequirementFor(cardId)).toEqual([
      { reduceCost: 4, materials: [{ count: 3, kinds: ["Digimon"], names: ["Sukamon"], levelMax: 4 }] },
    ]);

    // One sentence under three timings, with no printed [Once Per Turn]: three independent
    // effects, identical action lists, and no pooled use key.
    for (const trigger of ["OnPlay", "WhenDigivolving", "OnDeletion"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      expect(effect.frequency).toBeUndefined();
      expect(effect.sharedUseKey).toBeUndefined();
      expect(effect.actions).toEqual([
        {
          kind: "GrantStatic",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          grant: { originalName: "Sukamon", color: "white", dp: 3000 },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: ["hand", "digivolutionCards"],
                nameOrTrait: [{ tokens: ["Chuumon", "Sukamon"], match: "name" }],
              },
              count: 1,
            },
            raw: expect.any(String),
          },
          optional: true,
          abortOnDecline: true,
          raw: expect.any(String),
        },
      ]);
    }

    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "any",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
          },
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    playCostLte: 3,
                    nameOrTrait: [{ tokens: ["Chuumon", "Sukamon"], match: "name" }],
                  },
                  count: 1,
                  to: "play",
                  optional: true,
                },
              ],
              rest: "trash",
            },
          ],
        },
      ],
    });
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // [Assembly -4] 3 Lv.4 or lower Digimon cards w/[Sukamon] in name
  // ---------------------------------------------------------------------------

  it("plays by Assembly for 4 less with three [Sukamon]-named Lv.4 materials from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "king" }],
          trash: [
            { card: SUKAMON, as: "first" },
            { card: SUKAMON, as: "second" },
            { card: PLATINUM_SUKAMON, as: "substring" },
          ],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      // The Assembly materials land in the stack, so the [On Play] clause's trash cost becomes
      // payable from there; decline it so this test measures only the Assembly play.
      { autoDeclineOptional: true },
    );
    // Printed play cost 7, reduced by 4: exactly 3 memory.
    s.state.memory = 3;
    await s.ready();
    const materials = ["first", "second", "substring"].map((alias) => s.inst(alias).instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("king").instanceId,
        assembly: { materialInstanceIds: materials },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    const king = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId)!;
    expect(s.state.memory).toBe(0);
    // §7-3-2-6: the leftmost material ends up on top, so the placed order is reversed.
    expect(king.stack.map(({ instanceId }) => instanceId)).toEqual([...materials].reverse());
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("refuses Assembly when a material has no [Sukamon] in its name", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: cardId, as: "king" }],
        trash: [
          { card: SUKAMON, as: "first" },
          { card: SUKAMON, as: "second" },
          { card: CHUUMON_COST_3, as: "chuumon" },
        ],
        deck: [SENTINEL, SENTINEL],
        security: [SENTINEL],
      },
      1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
    });
    s.state.memory = 3;
    await s.ready();
    const materials = ["first", "second", "chuumon"].map((alias) => s.inst(alias).instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("king").instanceId,
        assembly: { materialInstanceIds: materials },
      } as never).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(materials);
  });

  it("refuses Assembly when a [Sukamon]-named material is above Lv.4", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: cardId, as: "king" }],
        trash: [
          { card: SUKAMON, as: "first" },
          { card: SUKAMON, as: "second" },
          { card: KING_SUKAMON_LV5, as: "levelFive" },
        ],
        deck: [SENTINEL, SENTINEL],
        security: [SENTINEL],
      },
      1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
    });
    s.state.memory = 3;
    await s.ready();
    const materials = ["first", "second", "levelFive"].map((alias) => s.inst(alias).instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("king").instanceId,
        assembly: { materialInstanceIds: materials },
      } as never).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // [On Play] By trashing 1 [Chuumon]/[Sukamon]-named card from hand or a stack,
  // rewrite 1 opposing Digimon to [Sukamon] / white / 3000 until their turn ends.
  // ---------------------------------------------------------------------------

  it("trashes a [Chuumon]-named card from hand and rewrites the opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "king" },
            { card: CHUUMON_COST_3, as: "fee" },
            { card: SPARE, as: "spare" },
          ],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_BODY, as: "victim" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const victim = s.perm("victim");

    // Baseline: black, 8000 DP, named "metalgreymon".
    expect(observe(s.engine).effectiveNames(victim)).toEqual(["metalgreymon"]);
    expect(observe(s.engine).effectiveColors(victim)).toEqual(["Black"]);
    expect(victim.currentDP).toBe(8000);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => victim.currentDP === 3000);
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).effectiveNames(victim)).toEqual(["sukamon"]);
    expect(observe(s.engine).effectiveColors(victim)).toEqual(["White"]);
    expect(victim.currentDP).toBe(3000);
    // The cost was paid from hand; the spare stayed.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fee").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  // "from your hand OR your Digimon's digivolution cards" — "your Digimon's", not "this
  // Digimon's" (contrast BT11-041, whose identical pool carries `hostFilter: {isSelfRef: true}`),
  // so an unrelated friendly stack pays with an empty hand.
  it("pays the cost from another of your Digimon's digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "king" }],
          battleArea: [{ card: NEUTRAL_LV3, as: "other", under: [{ card: PLATINUM_SUKAMON, as: "fee" }] }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_BODY, as: "victim" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const victim = s.perm("victim");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => victim.currentDP === 3000);
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).effectiveNames(victim)).toEqual(["sukamon"]);
    expect(victim.currentDP).toBe(3000);
    // The substring-named digivolution card left the stack for the trash.
    expect(s.perm("other").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fee").instanceId]);
  });

  it("cannot pay with a [Sukamon]-in-text card, so nothing is rewritten or trashed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "king" },
            { card: TEXT_ONLY_SUKAMON, as: "nearMatch" },
          ],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_BODY, as: "victim" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const victim = s.perm("victim");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).effectiveNames(victim)).toEqual(["metalgreymon"]);
    expect(observe(s.engine).effectiveColors(victim)).toEqual(["Black"]);
    expect(victim.currentDP).toBe(8000);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("nearMatch").instanceId]);
    assertNoLoudGap(s);
  });

  // "until their turn ends" spans two turn boundaries when the clause resolves on the
  // controller's own turn: it must survive the controller's turn end (what separates
  // `untilOpponentTurnEnd` from a plain `forTheTurn` grant) and expire at the opponent's.
  // Each boundary gets its own engine, because a hand-laid turn cannot be chained after another.
  it.each([
    ["survives the controller's own turn end", 0 as const, "sukamon", "White", 3000],
    ["expires at the opponent's turn end", 1 as const, "metalgreymon", "Black", 8000],
  ])("%s", async (_label, turnSeat, expectedName, expectedColor, expectedDP) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "king" },
            { card: CHUUMON_COST_3, as: "fee" },
          ],
          deck: Array(10).fill(SENTINEL),
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_BODY, as: "victim" }],
          deck: Array(10).fill(SENTINEL),
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const victim = s.perm("victim");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => victim.currentDP === 3000);
    await settle(() => s.state.pendingDecision === undefined);
    expect(observe(s.engine).effectiveNames(victim)).toEqual(["sukamon"]);

    s.state.turnSeat = turnSeat;
    await advance(s.engine).runTurn(turnSeat);
    await settle(() => s.state.pendingDecision === undefined);

    expect(observe(s.engine).effectiveNames(victim)).toEqual([expectedName]);
    expect(observe(s.engine).effectiveColors(victim)).toEqual([expectedColor]);
    expect(victim.currentDP).toBe(expectedDP);
  });

  it("may decline the whole optional processing condition, spending nothing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "king" },
            { card: CHUUMON_COST_3, as: "fee" },
          ],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_BODY, as: "victim" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const victim = s.perm("victim");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle(() => s.state.pendingDecision === undefined);

    // §15-7-2: the condition was not executed, so the processing after it cannot be — and the
    // trash cost itself is NOT spent (this card has no ruling pre-committing it).
    expect(victim.currentDP).toBe(8000);
    expect(observe(s.engine).effectiveNames(victim)).toEqual(["metalgreymon"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("fee").instanceId]);
  });

  // ---------------------------------------------------------------------------
  // [When Digivolving] on both printed routes, plus illegal sources.
  // ---------------------------------------------------------------------------

  it("digivolves from a Yellow Lv.4 for 3 and fires the rewrite, preserving source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YELLOW_LV4, as: "base" }],
          hand: [
            { card: cardId, as: "king" },
            { card: CHUUMON_COST_3, as: "fee" },
          ],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_BODY, as: "victim" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const victim = s.perm("victim");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("king").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle(() => victim.currentDP === 3000);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);
    // The digivolution bonus draw took the named top deck card.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(observe(s.engine).effectiveNames(victim)).toEqual(["sukamon"]);
    expect(observe(s.engine).effectiveColors(victim)).toEqual(["White"]);
    expect(victim.currentDP).toBe(3000);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("fee").instanceId]);
  });

  it("digivolves from a Black Lv.4 for 3 on the second printed route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PLATINUM_SUKAMON, as: "base" }],
          hand: [{ card: cardId, as: "king" }, SPARE],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      // The Black Lv.4 base is itself [Sukamon]-named, so declining the [When Digivolving] clause
      // keeps it out of the trash and leaves the stack identity visible.
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("king").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("base").instanceId]);
  });

  it("refuses a Lv.3 of the right colour and a Lv.4 of the wrong colour", async () => {
    for (const source of [YELLOW_LV3, GREEN_LV4]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: source, as: "base" }],
          hand: [{ card: cardId, as: "king" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      });
      s.state.memory = 10;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("king").instanceId,
          useAlternateCost: false,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      expect(s.perm("base").topCard.cardId).toBe(source);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("king").instanceId]);
      expect(s.state.memory).toBe(10);
    }
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] — the same clause off the board.
  // ---------------------------------------------------------------------------

  it("rewrites an opposing Digimon when it is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "king" }],
          hand: [{ card: SUKAMON, as: "fee" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: OPPONENT_BODY, as: "victim" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const victim = s.perm("victim");

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("king").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => victim.currentDP === 3000);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).effectiveNames(victim)).toEqual(["sukamon"]);
    expect(observe(s.engine).effectiveColors(victim)).toEqual(["White"]);
    expect(victim.currentDP).toBe(3000);
    // The [Sukamon]-named hand card paid, alongside the deleted KingSukamon itself.
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id).sort()).toEqual([SUKAMON, cardId].sort());
  });

  // ---------------------------------------------------------------------------
  // [Inherited] [All Turns] [Once Per Turn] other [Sukamon]-named Digimon deleted →
  // reveal 3, may free-play 1 cost-3-or-lower [Chuumon]/[Sukamon] Digimon, trash the rest.
  // ---------------------------------------------------------------------------

  it("reveals 3 and free-plays a cost-3 [Chuumon] when another [Sukamon]-named Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: SUKAMON, as: "fodder" },
          ],
          deck: [
            { card: CHUUMON_PLAYABLE, as: "freePlay" },
            { card: KING_SUKAMON_LV5, as: "tooExpensive" },
            { card: SENTINEL, as: "nonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("fodder").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CHUUMON_PLAYABLE));
    await settle(() => s.state.pendingDecision === undefined);

    // The cost-3 Chuumon entered play for free; memory never moved.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      [NEUTRAL_LV3, CHUUMON_PLAYABLE].sort(),
    );
    expect(s.state.memory).toBe(0);
    // "trash the rest": the cost-6 KingSukamon and the unnamed sentinel, plus the deleted fodder.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("tooExpensive").instanceId, s.inst("nonMatch").instanceId]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("trashes all three revealed cards when the only named one costs more than 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: SUKAMON, as: "fodder" },
          ],
          deck: [
            { card: KING_SUKAMON_LV5, as: "tooExpensive" },
            { card: TEXT_ONLY_SUKAMON, as: "textOnly" },
            { card: SENTINEL, as: "nonMatch" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("fodder").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.deck.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    // Only the host remains: the cost-6 [Sukamon] card and the [Sukamon]-in-TEXT near-match are
    // both refused by the play slot.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([NEUTRAL_LV3]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("tooExpensive").instanceId,
        s.inst("textOnly").instanceId,
        s.inst("nonMatch").instanceId,
      ]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
  });

  it("ignores the deletion of a Digimon with no [Sukamon] in its name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: CHUUMON_COST_3, as: "fodder" },
          ],
          deck: [
            { card: CHUUMON_PLAYABLE, as: "wouldPlay" },
            { card: SENTINEL, as: "second" },
            { card: SENTINEL, as: "third" },
            { card: SENTINEL, as: "fourth" },
          ],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("fodder").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([NEUTRAL_LV3]);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([CHUUMON_COST_3]);
  });

  it("fires once per turn and resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [cardId] },
            { card: SUKAMON, as: "firstFodder" },
            { card: PLATINUM_SUKAMON, as: "secondFodder" },
          ],
          deck: [
            { card: CHUUMON_PLAYABLE, as: "firstPlay" },
            { card: SENTINEL, as: "firstRest" },
            { card: SENTINEL, as: "secondRest" },
            { card: CHUUMON_PLAYABLE, as: "secondPlay" },
            ...Array(8).fill(SENTINEL),
          ],
          security: [SENTINEL],
        },
        1: { deck: Array(10).fill(SENTINEL), security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("firstFodder").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CHUUMON_PLAYABLE));
    await settle(() => s.state.pendingDecision === undefined);
    const deckAfterFirst = s.state.players[0]!.deck.length;

    // Same turn, second [Sukamon]-named deletion: the once-per-turn budget is spent, so the deck
    // is not touched again.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("secondFodder").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterFirst);
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === CHUUMON_PLAYABLE)).toHaveLength(1);

    // A real turn through the loop restores the budget.
    const revivedFodder = s.putOnBoard(0, { card: SUKAMON, as: "thirdFodder" });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    await settle(() => s.state.pendingDecision === undefined);

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([revivedFodder.permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.deck.length < deckAfterFirst);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.deck.length).toBeLessThan(deckAfterFirst);
  });

  it("does not grant the watcher without EX13-031 in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: NEUTRAL_LV3, as: "host", under: [SENTINEL] },
            { card: SUKAMON, as: "fodder" },
          ],
          deck: [
            { card: CHUUMON_PLAYABLE, as: "wouldPlay" },
            { card: SENTINEL, as: "second" },
            { card: SENTINEL, as: "third" },
            { card: SENTINEL, as: "fourth" },
          ],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("fodder").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([NEUTRAL_LV3]);
  });

  // The watcher says "any OTHER Digimon", and it arms on either side of the board — the sentence
  // carries no controller qualifier.
  it("arms on the opponent's [Sukamon]-named Digimon too", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NEUTRAL_LV3, as: "host", under: [cardId] }],
          deck: [
            { card: CHUUMON_PLAYABLE, as: "freePlay" },
            { card: SENTINEL, as: "second" },
            { card: SENTINEL, as: "third" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: SUKAMON, as: "opponentFodder" }],
          deck: [SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("opponentFodder").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CHUUMON_PLAYABLE));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.state.memory).toBe(0);
  });

  // Smallest legal stack that reaches the inherited clause through a REAL digivolution:
  // Yellow Lv.4 -> EX13-031 -> Yellow Lv.6, with the watcher still live on the new top card.
  it("keeps the inherited watcher after a Digimon digivolves onto it, preserving source identity", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "king", under: [{ card: YELLOW_LV4, as: "base" }] },
            { card: SUKAMON, as: "fodder" },
          ],
          hand: [{ card: YELLOW_LV6, as: "magnadramon" }],
          deck: [
            { card: SENTINEL, as: "bonusDraw" },
            { card: CHUUMON_PLAYABLE, as: "freePlay" },
            { card: SENTINEL, as: "secondRest" },
            { card: SENTINEL, as: "thirdRest" },
            { card: SENTINEL, as: "untouched" },
          ],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("king").permanentId,
        instanceId: s.inst("magnadramon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("king").topCard.cardId === YELLOW_LV6);
    await settle(() => s.state.pendingDecision === undefined);

    // Source identity survives: the Lv.4 base at the bottom, EX13-031 above it.
    expect(s.perm("king").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("base").instanceId,
      s.inst("king").instanceId,
    ]);
    expect(s.state.memory).toBe(0);

    // The inherited watcher still fires from inside the deeper stack: the reveal happens and the
    // rest are trashed even though this run declines the optional free play.
    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("fodder").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.deck.length === 1);
    await settle(() => s.state.pendingDecision === undefined);

    // Exactly three cards left the deck (reveal 3), and the fourth is untouched.
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.perm("king").topCard.cardId).toBe(YELLOW_LV6);
  });

  // "1 OTHER Digimon": the host's own deletion must not arm its inherited watcher.
  it("does not arm on the host's own deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: SUKAMON, as: "host", under: [cardId] }],
          deck: [
            { card: CHUUMON_PLAYABLE, as: "wouldPlay" },
            { card: SENTINEL, as: "second" },
            { card: SENTINEL, as: "third" },
            { card: SENTINEL, as: "fourth" },
          ],
          security: [SENTINEL],
        },
        1: { deck: [SENTINEL, SENTINEL], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });
});
