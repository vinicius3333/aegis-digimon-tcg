import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import "./EX13-065.js";
import { compiled } from "./EX13-065.js";

const cardId = "EX13-065";

// Inert neutral fixtures (main-deck Digimon with no printed effects at all).
const SENTINEL = "BT1-009"; // Red Lv.3 Monodramon, 3000 DP.
const NEUTRAL_LV3 = "BT1-013"; // Red Lv.3 Muchomon, 5000 DP.
const NEUTRAL_LV4 = "BT1-014"; // Red Lv.4 Kokatorimon, 4000 DP.
const BIG_VANILLA = "BT1-080"; // Green Lv.6 Titamon, 12000 DP, no printed effects — the DP target.

// [Sistermon Blanc] fixtures.
//   BT6-082  — White Lv.3 "Sistermon Blanc", play cost 3. The EXACT name. Its only printed
//              effects are an [On Play] ＜Draw 1＞ and an [All Turns] Aura gated on a
//              [Huckmon]/[Royal Knight] card being in play, which no fixture here supplies.
//   ST12-12  — a second printing, also exactly "Sistermon Blanc", play cost 3.
//   BT7-082  — "Sistermon Blanc (Awakened)", White Lv.3, play cost 5. Its name CONTAINS
//              "Sistermon Blanc" but is not equal to it, and it carries no inherited text:
//              the discriminator that pins `nameExact` against substring `name`.
//   BT10-085 — "Sistermon Ciel", play cost 4: in range for the Option's `playCostLte: 4`
//              and a [Sistermon] substring match, but never an exact "Sistermon Blanc".
const BLANC = "BT6-082";
const BLANC_REPRINT = "ST12-12";
const BLANC_AWAKENED_OLD = "BT7-082";
const CIEL_COST_6 = "BT7-083"; // "Sistermon Ciel (Awakened)", play cost 6 — over the ceiling.
const HUCKMON_TEXT_ONLY = "BT13-009"; // prints "[Sistermon]" only in its effect TEXT; cost 3.
// Option-side board fixtures. BT7-082 is the inert White colour source: it satisfies the
// printed White requirement, and because its name is NOT exactly "Sistermon Blanc" it is not a
// legal §4-19 Arts Digivolve target either, so the DUAL card reaches its normal trash step.
// BT10-085 "Sistermon Ciel" is the free-play fixture at exactly the printed play-cost ceiling
// of 4; its [On Play] needs a [Royal Knight] card in hand (none here) and its other clause is
// a memory trigger, so neither disturbs the endpoints.
const WHITE_SOURCE = BLANC_AWAKENED_OLD;
const CIEL_COST_4 = "BT10-085";

const EGG_NO_HUCKMON = "BT22-004"; // Green Lv.2 Digi-Egg, [CS] trait, no [Huckmon] anywhere.

const inertDeck = [SENTINEL, SENTINEL, SENTINEL, SENTINEL, SENTINEL];

describe("EX13-065 Sistermon Blanc (Awakened) / Divine Pierce (Awakened)", () => {
  it("matches the catalog printed text, stats and dual-card record", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "EX13",
      nameEn: "Sistermon Blanc (Awakened)",
      colors: ["White", "Yellow"],
      kinds: ["Digimon", "Option"],
      level: 3,
      playCost: 5,
      dp: 5000,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Puppet"],
      evoCosts: [],
      isDualCard: true,
      dualEffect: "Divine Pierce (Awakened)",
      optionColorRequirements: ["White"],
      effectText:
        "[Digivolve] [Sistermon Blanc]: Cost 0 [Digivolve] Lv.2 w/[Huckmon] in text: Cost 1 \n\n＜Decode ([Sistermon Blanc])＞ \n＜Guard＞ ",
      optionEffect:
        "[Main] You may play 1 play cost 4 or lower card with [Sistermon] from your hand or trash without paying the cost. Then, to 1 of your opponent's Digimon, give -3000 DP for the turn for each of your Digimon.",
    });
    // No inherited and no security text is printed.
    expect(getCardDefinition(cardId)?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition(cardId)?.securityEffectText).toBeUndefined();
  });

  it("compiles every printed clause and nothing else", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(5);
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);
    // No printed inherited text: nothing may be marked inherited.
    expect(compiled.effects.some(({ isInherited }) => isInherited === true)).toBe(false);

    expect(compiled.effects[0]).toEqual({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Decode", raw: "＜Decode ([Sistermon Blanc])＞" }],
    });
    expect(compiled.effects[1]).toEqual({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Guard", raw: "＜Guard＞" }],
    });

    // ＜Decode ([Sistermon Blanc])＞ — an executable leave replacement, NOT a prevention.
    const decode = compiled.effects[2]!;
    expect(decode).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  hostFilter: { isSelfRef: true },
                  nameOrTrait: [{ tokens: ["Sistermon Blanc"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(decode.actions[0]).not.toHaveProperty("mode");
    expect(decode.frequency).toBeUndefined();

    // ＜Guard＞ — the EX13-052 / EX12-056 prevention shape.
    expect(compiled.effects[3]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byOpponentEffect",
          affectsAll: true,
          target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: "all" },
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
      ],
    });

    // The Option side's [Main] body: the free play carries no `kind` ("card", not "Digimon
    // card") and no `abortOnDecline` (the "Then," process is independent, §15-6-2).
    const main = compiled.effects[4]!;
    expect(main.trigger).toBe("Main");
    expect(main.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        target: {
          filter: {
            controller: "mine",
            playCostLte: 4,
            nameOrTrait: [{ tokens: ["Sistermon"], match: "name" }],
          },
          count: 1,
        },
        from: ["hand", "trash"],
        payCost: false,
        optional: true,
      },
      {
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: -3000,
        duration: "forTheTurn",
        scaling: { per: 1, unit: "cards", filter: { controllerDefault: "mine", kind: ["Digimon"] } },
      },
    ]);
    expect((main.actions[0] as { target: { filter: { kind?: unknown } } }).target.filter.kind).toBeUndefined();
    expect(main.actions[0]).not.toHaveProperty("abortOnDecline");
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] [Sistermon Blanc]: Cost 0
  // ---------------------------------------------------------------------------

  it("publishes exactly the two printed [Digivolve] routes and no catalog EvoCost", () => {
    expect(digivolutionRequirementsFor(cardId)).toEqual([
      { namesExact: ["Sistermon Blanc"], cost: 0, isAlternate: true },
      { level: 2, texts: ["Huckmon"], cost: 1, isAlternate: true },
    ]);
    expect(getCardDefinition(cardId)?.evoCosts).toEqual([]);
  });

  it.each([
    ["the original printing", BLANC],
    ["a second printing of the same name", BLANC_REPRINT],
  ])("digivolves off %s for 0 memory, keeping the source under it and drawing 1", async (_label, sourceCardId) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sourceCardId, as: "base" }],
        hand: [{ card: cardId, as: "awakened" }],
        deck: inertDeck,
        security: [SENTINEL],
      },
      1: { deck: inertDeck, security: [SENTINEL] },
    });
    s.state.memory = 0;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;
    const basePermanentId = s.perm("base").permanentId;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: s.inst("awakened").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await settle();

    // Cost 0: memory is untouched. The digivolution bonus draw still happens.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore); // -1 played, +1 bonus draw
    // Source-stack identity survives: the base card is now the only digivolution card.
    expect(s.perm("base").permanentId).toBe(basePermanentId);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([sourceCardId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("refuses a source whose name merely CONTAINS [Sistermon Blanc], and a non-Sistermon Lv.3", () => {
    // `evoCosts` is empty, so there is no printed fallback route: a non-matching base can
    // only be refused outright. Both preferences are exercised because `useAlternateCost` is
    // a preference in both directions (coordinator note), so neither can mask a route.
    for (const [baseCardId, useAlternateCost] of [
      [BLANC_AWAKENED_OLD, true],
      [BLANC_AWAKENED_OLD, false],
      [NEUTRAL_LV3, true],
      [NEUTRAL_LV3, false],
      [BLANC_AWAKENED_OLD, undefined],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: cardId, as: "awakened" }],
          deck: inertDeck,
        },
      });
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("awakened").instanceId,
          ...(useAlternateCost === undefined ? {} : { useAlternateCost }),
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
      // Nothing was charged and nothing moved.
      expect(s.state.memory).toBe(5);
      expect(s.perm("base").topCard.cardId).toBe(baseCardId);
      expect(s.state.players[0]!.hand).toHaveLength(1);
    }
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.2 w/[Huckmon] in text: Cost 1
  //
  // RETAINED GAP (catalog, not engine): no Lv.2 card in `cards.json` carries the [Huckmon]
  // token anywhere in its printed information — EX13 is only 60/77 revealed and the set's
  // Huckmon-line Digi-Egg (EX13-004) is not yet imported. The route is therefore proven only
  // negatively: the requirement is published (above) and a Lv.2 Digi-Egg WITHOUT [Huckmon] is
  // refused. Re-run the positive once the missing Digi-Egg lands.
  // ---------------------------------------------------------------------------

  it("refuses a Lv.2 source with no [Huckmon] in its text", () => {
    const s = setupEngine({
      0: { breeding: { card: EGG_NO_HUCKMON, as: "egg" }, hand: [{ card: cardId, as: "awakened" }], deck: inertDeck },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("awakened").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.memory).toBe(5);
    expect(s.perm("egg").topCard.cardId).toBe(EGG_NO_HUCKMON);
  });

  // ---------------------------------------------------------------------------
  // ＜Decode ([Sistermon Blanc])＞
  // ---------------------------------------------------------------------------

  it("exposes the printed ＜Decode＞ and ＜Guard＞ keywords on the continuous ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "awakened" }], deck: inertDeck } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("awakened"), "Decode")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("awakened"), "Guard")).toBe(true);
  });

  it("plays the [Sistermon Blanc] out of its own stack when an effect makes it leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "awakened", under: [{ card: BLANC, as: "blanc" }] }],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const blancId = s.inst("blanc").instanceId;
    const awakenedPermanentId = s.perm("awakened").permanentId;
    const deckBefore = s.state.players[0]!.deck.length;

    expect(await advance(s.engine).verb.deletePermanent([awakenedPermanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === blancId));
    await settle();

    // The Digimon still LEFT (Decode is not a prevention) and the stacked card is now a
    // permanent of its own, with no stack beneath it.
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === awakenedPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.instanceId === blancId)!;
    expect(played.topCard!.cardId).toBe(BLANC);
    expect(played.stack).toHaveLength(0);
    // It was really PLAYED: BT6-082's own [On Play] ＜Draw 1＞ resolved.
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire ＜Decode＞ when the host leaves by battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "awakened", under: [{ card: BLANC, as: "blanc" }] }],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const blancId = s.inst("blanc").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("awakened").permanentId], "byBattle")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(blancId);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id).sort()).toEqual([BLANC, cardId].sort());
  });

  it("refuses a stacked [Sistermon Blanc (Awakened)] — the printed name gate is EXACT", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "awakened", under: [{ card: BLANC_AWAKENED_OLD, as: "notBlanc" }] }],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const notBlancId = s.inst("notBlanc").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("awakened").permanentId], "byEffect")).toBe(1);
    await settle();

    // Substring-matching would have played it; `nameExact` does not.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(notBlancId);
  });

  it("plays only from its own digivolution cards, never from a neighbour's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "awakened" },
            { card: NEUTRAL_LV4, as: "neighbour", under: [{ card: BLANC, as: "foreign" }] },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const foreignId = s.inst("foreign").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("awakened").permanentId], "byEffect")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === foreignId)).toBe(false);
    expect(s.perm("neighbour").stack.map(({ instanceId }) => instanceId)).toEqual([foreignId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // ＜Guard＞ — §16-45. Every fixture below keeps EX13-065's stack EMPTY so the Guard
  // self-delete cannot also set off ＜Decode＞ and confuse the endpoint.
  // ---------------------------------------------------------------------------

  it("saves another of your Digimon from an opponent's effect by deleting itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "awakened" },
            { card: NEUTRAL_LV4, as: "ally" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.trash.length === 1);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([allyId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("saves every matching Digimon in one leave event for a single payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "awakened" },
            { card: NEUTRAL_LV4, as: "allyA" },
            { card: NEUTRAL_LV3, as: "allyB" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const allyA = s.perm("allyA").permanentId;
    const allyB = s.perm("allyB").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyA, allyB], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.trash.length === 1);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId).sort()).toEqual([allyA, allyB].sort());
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
  });

  it("does not offer ＜Guard＞ against the controller's own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "awakened" },
            { card: NEUTRAL_LV4, as: "ally" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("ally").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual([cardId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([NEUTRAL_LV4]);
  });

  it("does not save itself — ＜Guard＞ protects OTHER Digimon only", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "awakened" },
            { card: NEUTRAL_LV4, as: "ally" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const allyId = s.perm("ally").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("awakened").permanentId], "byEffect")).toBe(1);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([allyId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
  });

  it("chains ＜Guard＞ into ＜Decode＞: the self-delete is a leave other than in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "awakened", under: [{ card: BLANC, as: "blanc" }] },
            { card: NEUTRAL_LV4, as: "ally" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const allyId = s.perm("ally").permanentId;
    const blancId = s.inst("blanc").instanceId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([allyId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === blancId));
    await settle();

    // The ally stayed, EX13-065 paid with itself, and its ＜Decode＞ put the stacked
    // [Sistermon Blanc] onto the board.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(allyId);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === blancId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
  });

  // ---------------------------------------------------------------------------
  // Option side — [Main] free [Sistermon] play, then scaled -3000 DP.
  // ---------------------------------------------------------------------------

  it("used as an Option, plays a [Sistermon] card free and gives -3000 DP per of your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          // WHITE_SOURCE satisfies the printed White colour requirement and counts for scaling.
          battleArea: [
            { card: WHITE_SOURCE, as: "colourSource" },
            { card: NEUTRAL_LV3, as: "other" },
          ],
          hand: [
            { card: cardId, as: "divinePierce" },
            { card: CIEL_COST_4, as: "freePlay" },
            { card: SENTINEL, as: "spare" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { battleArea: [{ card: BIG_VANILLA, as: "target" }], deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    await s.ready();
    const freePlayId = s.inst("freePlay").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("divinePierce").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP !== 12_000);
    await settle();

    // The free play landed without paying its own 4 cost...
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === freePlayId)).toBe(true);
    // ...so three of the controller's Digimon are in play: -3000 x 3.
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.perm("target").currentDP).toBe(12_000 - 9000);
    // Only the Option's own 5 play cost was paid.
    expect(s.state.memory).toBe(1);
    // The DUAL card resolved as an Option: it went to the trash, not the battle area.
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === cardId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toContain(cardId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("scales with the live count: one of your Digimon is -3000, not -9000", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WHITE_SOURCE, as: "colourSource" }],
          hand: [
            { card: cardId, as: "divinePierce" },
            { card: SENTINEL, as: "spare" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { battleArea: [{ card: BIG_VANILLA, as: "target" }], deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("divinePierce").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP !== 12_000);
    await settle();

    // Nothing in hand or trash matched the free play, so only the colour source counts.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(12_000 - 3000);
  });

  it("plays the free [Sistermon] card out of the trash as well as the hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WHITE_SOURCE, as: "colourSource" }],
          hand: [
            { card: cardId, as: "divinePierce" },
            { card: SENTINEL, as: "spare" },
          ],
          trash: [{ card: CIEL_COST_4, as: "fromTrash" }],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { battleArea: [{ card: BIG_VANILLA, as: "target" }], deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    await s.ready();
    const fromTrashId = s.inst("fromTrash").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("divinePierce").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === fromTrashId));
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("target").currentDP).toBe(12_000 - 6000);
  });

  it("refuses an over-cost [Sistermon] card and a card that only MENTIONS [Sistermon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WHITE_SOURCE, as: "colourSource" }],
          hand: [
            { card: cardId, as: "divinePierce" },
            { card: CIEL_COST_6, as: "overCost" },
            { card: HUCKMON_TEXT_ONLY, as: "textOnly" },
            { card: SENTINEL, as: "spare" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { battleArea: [{ card: BIG_VANILLA, as: "target" }], deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    await s.ready();
    const overCostId = s.inst("overCost").instanceId;
    const textOnlyId = s.inst("textOnly").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("divinePierce").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP !== 12_000);
    await settle();

    // `playCostLte: 4` excludes the play-cost-6 Sistermon Ciel (Awakened); the substring NAME
    // gate excludes BT13-009 Huckmon, which carries "[Sistermon]" only in its effect text.
    const handIds = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(handIds).toContain(overCostId);
    expect(handIds).toContain(textOnlyId);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(12_000 - 3000);
  });

  it("still applies the DP reduction when the optional free play is declined (§15-6-2)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: WHITE_SOURCE, as: "colourSource" },
            { card: NEUTRAL_LV3, as: "other" },
          ],
          hand: [
            { card: cardId, as: "divinePierce" },
            { card: CIEL_COST_4, as: "declined" },
            { card: SENTINEL, as: "spare" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { battleArea: [{ card: BIG_VANILLA, as: "target" }], deck: inertDeck, security: [SENTINEL] },
      },
      // autoAcceptOptional omitted: the "You may play" prompt is declined on timeout.
      { autoSelectCards: false, autoOrderTriggers: true, autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();
    const declinedId = s.inst("declined").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("divinePierce").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP !== 12_000);
    await settle();

    // The play was declined...
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(declinedId);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    // ...and the independent "Then," process still ran, scaled by the two Digimon in play.
    expect(s.perm("target").currentDP).toBe(12_000 - 6000);
  });

  it("§4-19 Arts Digivolve: after the Option resolves, a [Sistermon Blanc] may digivolve into it", async () => {
    const s = setupEngine(
      {
        0: {
          // BT6-082 is exactly "Sistermon Blanc", so this card's own cost-0 [Digivolve] route
          // makes it a legal §4-19-2 Arts Digivolve target — the DUAL card is then consumed by
          // the digivolve instead of going to the trash.
          battleArea: [{ card: BLANC, as: "artsTarget" }],
          hand: [
            { card: cardId, as: "divinePierce" },
            { card: SENTINEL, as: "spare" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { battleArea: [{ card: BIG_VANILLA, as: "target" }], deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    await s.ready();
    const blancInstanceId = s.inst("artsTarget").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("divinePierce").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("artsTarget").topCard.cardId === cardId);
    await settle();

    // The Option body still resolved (one Digimon in play: -3000)...
    expect(s.perm("target").currentDP).toBe(12_000 - 3000);
    // ...and then the DUAL card became a Digimon on top of the Sistermon Blanc, not trash.
    expect(s.perm("artsTarget").stack.map(({ instanceId }) => instanceId)).toEqual([blancInstanceId]);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).not.toContain(cardId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it('negative control: played WITHOUT useAs:"option" it is a Digimon permanent and the Option body never fires', async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: WHITE_SOURCE, as: "colourSource" }],
          hand: [
            { card: cardId, as: "awakened" },
            { card: CIEL_COST_4, as: "wouldBeFreePlay" },
            { card: SENTINEL, as: "spare" },
          ],
          deck: inertDeck,
          security: [SENTINEL],
        },
        1: { battleArea: [{ card: BIG_VANILLA, as: "target" }], deck: inertDeck, security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 6;
    await s.ready();
    const wouldBeFreePlayId = s.inst("wouldBeFreePlay").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("awakened").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === cardId));
    await settle();

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === cardId)).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(wouldBeFreePlayId);
    expect(s.perm("target").currentDP).toBe(12_000);
    expect(s.state.memory).toBe(1);
  });
});
