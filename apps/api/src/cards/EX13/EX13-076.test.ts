import { EffectTiming, assemblyRequirementFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX13-076.js";
// The whole registry, so every fixture carries its own implementation; EX13-076 itself is
// registered by the import above (it is not yet listed in EX13/index.ts).
import "../index.js";

const cardId = "EX13-076";

// Evolution fixtures. The catalog EvoCosts are Blue Lv.6 for 6 and Green Lv.6 for 6; the printed
// [Digivolve] header adds a colourless "Lv.6 w/[Free]/[Royal Knight] trait: Cost 5" route.
//   BT3-075  Craniamon   BLACK Lv.6 12000, [Royal Knight], no inherited text — matches the
//                        alternate route's TRAIT half and NO printed EvoCost (it is black), so a
//                        charge of 5 can only have come from the alternate route.
//   BT16-013 Valkyrimon  RED/YELLOW Lv.6 12000, [Free] ATTRIBUTE, no inherited text — the other
//                        half of the "[Free]/[Royal Knight]" slash, likewise off-colour.
//   ST2-10   Plesiomon   BLUE Lv.6 12000, [Data]/[Plesiosaur] — the printed-EvoCost control: the
//                        alternate route refuses it, so it costs the catalog's 6.
//   BT2-064  HiAndromon  BLACK Lv.6 12000, [Vaccine]/[Cyborg] — neither route: wrong colour for
//                        the EvoCosts and wrong traits for the alternate. The illegal source.
const ROYAL_LV6 = "BT3-075";
const FREE_LV6 = "BT16-013";
const PRINTED_LV6 = "ST2-10";
const ILLEGAL_LV6 = "BT2-064";

// Assembly fixtures ("6 [Free]/[Royal Knight] trait Digimon cards w/different names"). All six
// carry no inherited text, so stacking them adds nothing to the board.
//   BT1-027 Armadillomon  Lv.3, [Free]
//   BT3-009 Hawkmon       Lv.3, [Free]
//   BT3-021 Veemon        Lv.3, [Free]
//   BT3-047 Wormmon       Lv.3, [Free]
//   BT1-083 GranKuwagamon Lv.6, [Free] — no level bound is printed, so a Mega is a legal material
//   BT3-075 Craniamon     Lv.6, [Royal Knight] — the TRAIT-UNION material: nothing about it
//                         answers [Free], so the recipe must accept it on [Royal Knight] alone
// Negatives:
//   BT3-032 Armadillomon  a SECOND print named Armadillomon, also [Free] — `differentNames`
//   BT1-009 Monodramon    [Vaccine]/[Mini Dragon] — neither printed trait
const MAT_ARMADILLO = "BT1-027";
const MAT_HAWKMON = "BT3-009";
const MAT_VEEMON = "BT3-021";
const MAT_WORMMON = "BT3-047";
const MAT_GRANKUWAGA = "BT1-083";
const MAT_ROYAL = ROYAL_LV6;
const MAT_DUPLICATE_NAME = "BT3-032";
const MAT_NON_TRAIT = "BT1-009";

// Neutral inert main-deck fixtures (no printed text of any kind).
const VICTIM = "BT1-013"; // Muchomon, Red Lv.3, 5000 DP
const FILLER_A = "BT1-010"; // Agumon, Red Lv.3, 2000 DP
const FILLER_B = "BT1-011"; // Agumon Expert, Red Lv.3, 1000 DP
const FILLER_C = "BT1-014"; // Kokatorimon, Red Lv.4, 4000 DP

const DECK = [FILLER_A, FILLER_B, FILLER_C];

describe("EX13-076 Imperialdramon: Paladin Mode", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Imperialdramon: Paladin Mode",
      colors: ["White", "Blue", "Green"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 16,
      dp: 16_000,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Ancient Holy Warrior"],
      evoCosts: [
        { color: "Blue", level: 6, memoryCost: 6 },
        { color: "Green", level: 6, memoryCost: 6 },
      ],
    });
    expect(getCardDefinition(cardId)?.inheritedEffectText ?? "").toBe("");
    expect(getCardDefinition(cardId)?.securityEffectText ?? "").toBe("");
    // The printed [Rule] line is what `staticTraitsOf` regex-parses into a live trait.
    expect(getCardDefinition(cardId)?.effectText).toContain("[Rule] Trait: Has [Free] Attribute.");
  });

  it("compiles every printed clause into the committed IR", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full" });
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.some(({ isInherited }) => isInherited)).toBe(false);
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);

    expect(
      compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords ?? []),
    ).toEqual([
      { keyword: "Piercing", raw: "＜Piercing＞" },
      { keyword: "Vortex", raw: "＜Vortex＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
      { keyword: "Evade", raw: "＜Evade＞" },
    ]);

    // "[Digivolve] Lv.6 w/[Free]/[Royal Knight] trait: Cost 5" — colourless, EXACT traits, OR-matched.
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, traits: ["Free", "Royal Knight"], cost: 5, isAlternate: true },
    ]);

    // "[Assembly -8] 6 [Free]/[Royal Knight] trait Digimon cards w/different names" — one repeated
    // slot; "Digimon cards" means the slot DOES carry a `kinds` gate, unlike EX13-063's bare "cards".
    expect(assemblyRequirementFor(cardId)).toEqual([
      {
        reduceCost: 8,
        materials: [{ count: 6, kinds: ["Digimon"], traits: ["Free", "Royal Knight"], differentNames: true }],
      },
    ]);
    expect(compiled.assemblyRequirement![0]!.materials[0]!.levelMax).toBeUndefined();

    const body = [
      {
        kind: "Suspend",
        optional: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      },
      {
        kind: "SelectBind",
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, bindAs: "paladinBattleTarget" },
      },
      {
        kind: "GainKeyword",
        keyword: { keyword: "IceClad", raw: "＜Ice Clad＞" },
        duration: "untilEndOfBattle",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      },
      {
        kind: "ReturnTopDigivolutionCards",
        cardsPerTarget: 99,
        position: "bottom",
        target: {
          filter: { controller: "opponent", kind: ["Digimon"] },
          count: 1,
          fromSelectionRef: "paladinBattleTarget",
        },
      },
      {
        kind: "Battle",
        attacker: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        defender: {
          filter: { controller: "opponent", kind: ["Digimon"] },
          count: 1,
          fromSelectionRef: "paladinBattleTarget",
        },
      },
    ];
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-paladin-suspend-battle",
        actions: body,
      });
    }
    // §15-6-2: only the SECOND "may" gates its own siblings. Declining the leading suspend leaves
    // the "Then, you may ..." half available, so the Suspend carries no `abortOnDecline`.
    const onPlay = compiled.effects.find(({ trigger }) => trigger === "OnPlay")!;
    expect(onPlay.actions[0]).not.toHaveProperty("abortOnDecline");
    // "have this Digimon battle it" is mandatory once the single "may" was accepted.
    expect(onPlay.actions[4]).not.toHaveProperty("optional");

    const battleWon = compiled.effects.find(({ trigger }) => trigger === "AllTurns")!;
    expect(battleWon).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Return",
              to: "deckBottom",
              optional: true,
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            },
            {
              kind: "Unsuspend",
              optional: true,
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
        },
      ],
    });
    expect(battleWon.sharedUseKey).toBeUndefined();

    expect(compiled.effects.find(({ trigger }) => trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Free"] }],
    });
  });

  // ---------------------------------------------------------------------------
  // ＜Piercing＞ ＜Vortex＞ ＜Blocker＞ ＜Evade＞ and [Rule] Trait: Has [Free] Attribute.
  // ---------------------------------------------------------------------------

  it("carries all four printed keywords and the rule-granted [Free] trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "paladin" }], deck: DECK },
      1: { deck: DECK, security: [FILLER_B] },
    });
    await s.ready();

    for (const keyword of ["Piercing", "Vortex", "Blocker", "Evade"]) {
      expect(observe(s.engine).hasKeyword(s.perm("paladin"), keyword)).toBe(true);
    }
    // The [Rule] line is parsed straight out of `effectText` by `staticTraitsOf`, so the trait is
    // live with or without the IR entry — this asserts the trait, not the IR.
    expect(getCardDefinition(cardId)?.attributes).toEqual(["Vaccine"]);
    expect(cardHasTrait(cardId, "Free")).toBe(true);
    expect(cardHasTrait(cardId, "Royal Knight")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.6 w/[Free]/[Royal Knight] trait: Cost 5
  // ---------------------------------------------------------------------------

  const digivolveFrom = async (base: string, memory: number) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base", under: [FILLER_B] }],
          hand: [{ card: cardId, as: "paladin" }],
          deck: [{ card: FILLER_A, as: "drawn" }, FILLER_C, FILLER_C],
        },
        1: { deck: DECK, security: [FILLER_B] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = memory;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("paladin").instanceId,
    });
    if (result.ok === true) await settle(() => s.perm("base").topCard.cardId === cardId);
    return s;
  };

  it("digivolves from a Lv.6 [Royal Knight] for the alternate 5, keeping the source stack and drawing 1", async () => {
    const s = await digivolveFrom(ROYAL_LV6, 6);

    // Black Craniamon answers NO printed EvoCost (both are Blue/Green), so a charge of exactly 5
    // can only be the colourless "Lv.6 w/[Free]/[Royal Knight] trait" route.
    expect(s.state.memory).toBe(1);
    const paladin = s.perm("base");
    expect(paladin.topCard.cardId).toBe(cardId);
    // Source-stack identity: the base and the card that was already under it, in order.
    expect(paladin.stack.map(({ cardId: id }) => id)).toEqual([FILLER_B, ROYAL_LV6]);
    expect(paladin.currentDP).toBe(16_000);
    // The digivolve's bonus draw.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    // Inherited text survives the transition: BT3-075 prints none, and the four keywords are the
    // new top card's own.
    for (const keyword of ["Piercing", "Vortex", "Blocker", "Evade"]) {
      expect(observe(s.engine).hasKeyword(paladin, keyword)).toBe(true);
    }
  });

  it("accepts the [Free] half of the same route and charges the printed 6 for a Blue Lv.6 without either trait", async () => {
    const free = await digivolveFrom(FREE_LV6, 6);
    expect(free.state.memory).toBe(1);
    expect(free.perm("base").topCard.cardId).toBe(cardId);

    // Plesiomon is Blue Lv.6 but [Data]/[Plesiosaur]: the alternate route refuses it, so the
    // catalog's Blue Lv.6-for-6 EvoCost is the only route and charges one more.
    const printed = await digivolveFrom(PRINTED_LV6, 6);
    expect(printed.state.memory).toBe(0);
    expect(printed.perm("base").topCard.cardId).toBe(cardId);
  });

  it("refuses a Lv.6 with neither the colour nor the traits", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ILLEGAL_LV6, as: "base" }],
          hand: [{ card: cardId, as: "paladin" }],
          deck: DECK,
        },
        1: { deck: DECK, security: [FILLER_B] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("paladin").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("base").topCard.cardId).toBe(ILLEGAL_LV6);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // [Assembly -8] 6 [Free]/[Royal Knight] trait Digimon cards w/different names
  // ---------------------------------------------------------------------------

  it("plays by Assembly from the trash for 8 less, stacking the six materials in printed order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "paladin" }],
          trash: [
            { card: MAT_ARMADILLO, as: "m1" },
            { card: MAT_HAWKMON, as: "m2" },
            { card: MAT_VEEMON, as: "m3" },
            { card: MAT_WORMMON, as: "m4" },
            { card: MAT_GRANKUWAGA, as: "m5" },
            { card: MAT_ROYAL, as: "m6" },
          ],
          deck: DECK,
          security: [FILLER_B],
        },
        1: { deck: DECK, security: [FILLER_B] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("paladin").instanceId,
        assembly: {
          materialInstanceIds: ["m1", "m2", "m3", "m4", "m5", "m6"].map((alias) => s.inst(alias).instanceId),
        },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    await settle();

    // Printed play cost 16 reduced by the printed 8. The [Royal Knight] Craniamon counted on its
    // trait alone, so the recipe's trait pair is a genuine OR.
    expect(s.state.memory).toBe(2);
    const paladin = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId)!;
    // §7-3-2-6: the first-declared material ends up closest to the played card (top of the pile).
    expect(paladin.stack.map(({ instanceId }) => instanceId)).toEqual(
      ["m6", "m5", "m4", "m3", "m2", "m1"].map((alias) => s.inst(alias).instanceId),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
    // [On Play] fired with no opponent Digimon on the board, so it found nothing to act on.
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("refuses a duplicate name, a card with neither printed trait, and a short material count", async () => {
    const declare = async (aliases: string[]) => {
      const s = setupEngine({
        0: {
          hand: [{ card: cardId, as: "paladin" }],
          trash: [
            { card: MAT_ARMADILLO, as: "m1" },
            { card: MAT_HAWKMON, as: "m2" },
            { card: MAT_VEEMON, as: "m3" },
            { card: MAT_WORMMON, as: "m4" },
            { card: MAT_GRANKUWAGA, as: "m5" },
            { card: MAT_ROYAL, as: "m6" },
            { card: MAT_DUPLICATE_NAME, as: "twin" },
            { card: MAT_NON_TRAIT, as: "nonTrait" },
          ],
          deck: DECK,
          security: [FILLER_B],
        },
        1: { deck: DECK, security: [FILLER_B] },
      });
      s.state.memory = 10;
      await s.ready();
      const result = s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("paladin").instanceId,
        assembly: { materialInstanceIds: aliases.map((alias) => s.inst(alias).instanceId) },
      } as never);
      return { result, memory: s.state.memory, board: s.state.players[0]!.battleArea.length };
    };

    for (const aliases of [
      // `differentNames`: BT1-027 and BT3-032 are both named Armadillomon.
      ["m1", "twin", "m2", "m3", "m4", "m5"],
      // Monodramon is [Vaccine]/[Mini Dragon] — neither [Free] nor [Royal Knight].
      ["m1", "m2", "m3", "m4", "m5", "nonTrait"],
      // §7-3-2-4: the exact printed count of 6 must be placed.
      ["m1", "m2", "m3", "m4", "m5"],
    ]) {
      const { result, memory, board } = await declare(aliases);
      expect(result).toMatchObject({ ok: false });
      expect(memory).toBe(10);
      expect(board).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // [On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may suspend 1 of your
  // opponent's Digimon. Then, you may return all digivolution cards of 1 of their Digimon to the
  // bottom of the deck and have this Digimon battle it. Compare the number of digivolution cards
  // instead of DP in this battle.
  // ---------------------------------------------------------------------------

  it("suspends, empties the chosen Digimon's whole stack to the deck bottom, and battles it", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }], deck: DECK, security: [FILLER_B] },
        1: {
          battleArea: [{ card: VICTIM, as: "victim", under: [FILLER_A, FILLER_C] }],
          deck: [{ card: FILLER_B, as: "deckFloor" }],
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const victimTopId = s.perm("victim").topCard.instanceId;
    const stackIds = s.perm("victim").stack.map(({ instanceId }) => instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    // Both digivolution cards left the battle area for the BOTTOM of their owner's deck — the
    // Digimon itself stayed in play for the battle, which `Return.returnDigivolutionCardsFirst`
    // (it would have returned the Digimon too) and ＜De-Digivolve＞ (trash, level-3 floor) cannot do.
    // `returnStackTopsToDeck` inserts the batch bottom-first, so the former stack lands reversed
    // under the card that was already the deck's floor.
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckFloor").instanceId,
      ...[...stackIds].reverse(),
    ]);
    // Paladin Mode has 1 digivolution card and the stripped victim has 0, so the count comparison
    // deletes the victim alone; its top card goes to its owner's trash.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([victimTopId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("paladin").stack).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("compares digivolution cards, not DP: a stackless Paladin Mode TIES a 5000 DP victim", async () => {
    // Paladin Mode is 16000 DP against a 5000 DP Muchomon, so a DP battle would be a clean win
    // with nothing happening to the attacker. Under the printed comparison both sides hold ZERO
    // digivolution cards after the strip, which is a tie — and a tie puts the attacker on the
    // deletion list too, where its printed ＜Evade＞ saves it by suspending (§16-35-4 + §16-30).
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "paladin" }], deck: DECK, security: [FILLER_B] },
        1: {
          battleArea: [{ card: VICTIM, as: "victim" }],
          deck: [{ card: FILLER_B, as: "deckFloor" }],
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("paladin").currentDP).toBe(16_000);
    expect(s.perm("victim").currentDP).toBe(5000);

    const paladinId = s.perm("paladin").permanentId;
    // ＜Evade＞ is a combat-window decision, not a `state.pendingDecision`, so no auto-responder
    // answers it — hold the firing promise and answer the intent by hand.
    const firing = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));

    // THE PROOF: an ＜Evade＞ window opened for PALADIN MODE. That only happens when the battle put
    // the attacker on the deletion list, which a 16000-vs-5000 DP comparison never would.
    expect(s.events.filter(({ kind }) => kind === "evadePrompt")).toHaveLength(1);

    // Decline it, so the raw tie stands and both battlers are deleted.
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: paladinId, accept: false })).toEqual({
      ok: true,
    });
    await firing;
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual([cardId]);
    assertNoLoudGap(s);
  });

  it("does nothing when the printed 'may' is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }], deck: DECK, security: [FILLER_B] },
        1: {
          battleArea: [{ card: VICTIM, as: "victim", under: [FILLER_A, FILLER_C] }],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle();

    expect(s.perm("victim").isSuspended).toBe(false);
    expect(s.perm("victim").stack).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(3);
  });

  it("shares one [Once Per Turn] across all three timings and resets on the next own turn", async () => {
    // Paladin Mode is seeded STACKLESS so every forced battle is a 0-vs-0 tie: nobody wins it, and
    // the [All Turns] won-battle clause (which would otherwise return "second" to the deck) stays
    // quiet. "second" is therefore a clean witness for the shared per-turn budget.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin" }],
          hand: [{ card: FILLER_A, as: "spare" }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [
            { card: VICTIM, as: "first" },
            { card: FILLER_C, as: "second", under: [FILLER_A, FILLER_B] },
          ],
          hand: [{ card: FILLER_B, as: "spareOpponent" }],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    await s.ready();
    // Pin every selection of the first activation onto "first".
    prefer.push(s.perm("first").topCard.instanceId);
    const paladinId = s.perm("paladin").permanentId;
    const secondId = s.perm("second").permanentId;

    const firing = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    // Accept ＜Evade＞ so the host survives its own tie and can try the other two windows.
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: paladinId, accept: true })).toEqual({
      ok: true,
    });
    await firing;
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([secondId]);
    expect(s.perm("second").stack).toHaveLength(2);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.perm("paladin").isSuspended).toBe(true);

    // Same per-turn use: neither of the two remaining windows may activate, so "second" keeps its
    // stack and its orientation and no second ＜Evade＞ window ever opens.
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("paladin"));
    await settle();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("paladin"));
    await settle();
    expect(s.perm("second").stack).toHaveLength(2);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.events.filter(({ kind }) => kind === "evadePrompt")).toHaveLength(1);

    // Through the real turn loop: the opponent's turn clears the use.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("paladin"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();
    // The window reopened: "second" was suspended, stripped and battled. The host is still
    // suspended from its earlier ＜Evade＞, so this tie deletes it with no new prompt.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.events.filter(({ kind }) => kind === "evadePrompt")).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // [All Turns] [Once Per Turn] When this Digimon wins a battle, you may return 1 of your
  // opponent's Digimon to the bottom of the deck. Then, this Digimon may unsuspend.
  // ---------------------------------------------------------------------------

  it("returns an opponent Digimon to the deck bottom and unsuspends itself after a won battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B], suspended: true }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [{ card: VICTIM, as: "target", under: [FILLER_A] }],
          deck: [{ card: FILLER_B, as: "deckFloor" }],
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const targetTopId = s.perm("target").topCard.instanceId;
    const targetStackId = s.perm("target").stack[0]!.instanceId;

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("paladin").permanentId });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    // "return 1 of your opponent's Digimon to the bottom of the deck" takes the whole permanent:
    // the top card goes to the deck bottom and its digivolution card falls to the trash.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("deckFloor").instanceId,
      targetTopId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([targetStackId]);
    // "Then, this Digimon may unsuspend."
    expect(s.perm("paladin").isSuspended).toBe(false);
  });

  it("fires the won-battle clause once per turn and resets on the next own turn", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B], suspended: true }],
          hand: [{ card: FILLER_A, as: "spare" }],
          deck: DECK,
          security: [FILLER_B],
        },
        1: {
          battleArea: [
            { card: VICTIM, as: "first" },
            { card: FILLER_C, as: "second" },
          ],
          hand: [{ card: FILLER_B, as: "spareOpponent" }],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    await s.ready();
    prefer.push(s.perm("first").topCard.instanceId);

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("paladin").permanentId });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();
    expect(s.perm("paladin").isSuspended).toBe(false);

    // Second win in the same turn: the budget is spent, so "second" stays and the re-suspended
    // host stays suspended.
    s.perm("paladin").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("paladin").permanentId });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("paladin").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    s.perm("paladin").isSuspended = true;
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("paladin").permanentId });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("paladin").isSuspended).toBe(false);
  });

  it("does not fire the won-battle clause for another Digimon's win", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "paladin", under: [FILLER_B], suspended: true },
            { card: FILLER_C, as: "other" },
          ],
          deck: DECK,
          security: [FILLER_B],
        },
        1: { battleArea: [{ card: VICTIM, as: "target" }], deck: DECK, security: [FILLER_B] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("other").permanentId });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("paladin").isSuspended).toBe(true);
  });

  it("drops the count-comparison grant once the battle it was printed for is over", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "paladin", under: [FILLER_B] }], deck: DECK, security: [FILLER_B] },
        1: {
          battleArea: [{ card: VICTIM, as: "victim", under: [FILLER_A] }],
          deck: DECK,
          security: [FILLER_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("paladin"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    expect(observe(s.engine).hasKeyword(s.perm("paladin"), "IceClad")).toBe(false);
  });
  it("ends the source-count grant after public evolution before the next security battle", async () => {
    const stronger = "BT12-112";
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ROYAL_LV6, as: "base" }],
          hand: [{ card: cardId, as: "paladin" }, FILLER_A],
          deck: [FILLER_A, FILLER_C],
          security: [FILLER_C],
        },
        1: {
          battleArea: [{ card: stronger, as: "victim", under: [{ card: FILLER_C, as: "returnedSource" }] }],
          deck: [{ card: FILLER_A, as: "deckTop" }],
          security: [{ card: stronger, as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const paladinId = s.inst("paladin").instanceId;
    const victimId = s.inst("victim").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: paladinId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some((card) => card.instanceId === victimId) && s.state.pendingDecision === undefined,
    );
    const paladin = s.perm("paladin");
    expect(paladin.currentDP).toBe(16000);
    expect(paladin.stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("deckTop").instanceId,
      s.inst("returnedSource").instanceId,
    ]);
    expect(observe(s.engine).hasKeyword(paladin, "IceClad")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: paladin.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId).sort()).toEqual([baseId, paladinId].sort());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId).sort()).toEqual(
      [victimId, s.inst("security").instanceId].sort(),
    );
    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });
});
