import { compiledEffects, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";
import { compiled } from "./EX13-056.js";

const CARD_ID = "EX13-056";

// Fixtures, and why each one is here. The two printed slots are "level 4 or lower black Digimon
// card with ＜Blocker＞" (main, from the reveal) and "level 5 or lower black Digimon card with
// ＜Blocker＞" (inherited, from hand), so every fixture pins exactly one of the four predicates.
//
//   BT13-061 Gotsumon    BLACK Lv.3, 1000 DP, printed text is ＜Blocker＞ and nothing else — the
//                        cleanest positive for BOTH slots, and the legal Black Lv.3 bottom of the
//                        digivolution stack.
//   BT2-058  Guardromon  BLACK Lv.4, 7000 DP, play cost 5, printed ＜Blocker＞ — the top of the
//                        main slot's level range, and the legal Black Lv.4 digivolution source
//                        into this card. Its only other clause is "[Your Turn] This Digimon can't
//                        attack", inert for every assertion here.
//   BT2-061  Andromon    BLACK Lv.5, 7000 DP, play cost 7, printed ＜Blocker＞ and nothing else —
//                        OUT of the main slot (level 5 > 4) but IN the inherited slot (level 5).
//                        The one fixture that discriminates the two printed ceilings.
//   BT13-077 Craniamon   BLACK Lv.6 with printed ＜Blocker＞ — above BOTH ceilings, so it is the
//                        inherited slot's level negative.
//   BT13-067 Gladimon    BLACK Lv.4 whose only printed keyword is ＜Jamming＞ — the NEAR-MATCH
//                        keyword negative: a filter that merely asked "has some keyword" would
//                        wrongly admit it.
//   BT13-066 Dorugamon   BLACK Lv.4 with no printed text at all — the plain no-keyword negative.
//   BT2-072  Vilemon     PURPLE Lv.4 with printed ＜Blocker＞ — the colour negative: every other
//                        predicate matches.
//   BT1-014  Kokatorimon inert RED Lv.4 — the neutral HOST that carries this card as a
//                        digivolution card for the inherited clause, and the illegal
//                        (wrong-colour) digivolution source.
//   BT1-009..BT1-013     inert red main-deck Digimon — neutral deck, security and hand bulk.
const MATCH_LV3 = "BT13-061";
const MATCH_LV4 = "BT2-058";
const MATCH_LV5 = "BT2-061";
const MATCH_LV6 = "BT13-077";
const NEAR_MATCH_KEYWORD = "BT13-067";
const NO_KEYWORD_BLACK = "BT13-066";
const WRONG_COLOUR = "BT2-072";
const HOST = "BT1-014";
const SENTINEL = "BT1-009";
const SPARE = "BT1-010";
const NEUTRAL = "BT1-013";
const DECK = [SENTINEL, SPARE, "BT1-011", "BT1-012"];

function combatOf(s: ReturnType<typeof setupEngine>) {
  return (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
}

/** Seat 0 holding Giromon plus a deck whose top 3 are the named reveal fixtures. */
function revealBoard(top: { card: string; as: string }[], extra?: { suspended?: boolean }) {
  return {
    0: {
      battleArea: [{ card: CARD_ID, as: "giromon", suspended: extra?.suspended ?? false }],
      hand: [{ card: SPARE, as: "spare" }],
      deck: [...top, { card: SENTINEL, as: "untouched" }],
      security: [SENTINEL],
    },
    1: { hand: [{ card: "BT1-012", as: "spareOpponent" }], deck: DECK, security: [SPARE] },
  };
}

describe("EX13-056 Giromon", () => {
  it("matches the complete catalog identity and printed text", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX13",
      nameEn: "Giromon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Mine"],
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      rarity: "U",
    });
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition.effectText).toBe(
      "＜Collision＞ \n＜Blocker＞ \n[All Turns] [Once Per Turn] When this Digimon suspends, reveal the top 3 cards of your deck. You may play 1 level 4 or lower black Digimon card with ＜Blocker＞ among them without paying the cost. Trash the rest.\n[Rule] Trait: Has [Machine] Type.",
    );
    expect(definition.inheritedEffectText).toBe(
      "[Opponent's Turn] [Once Per Turn] When any of your Digimon suspend, you may play 1 level 5 or lower black Digimon card with ＜Blocker＞ from your hand without paying the cost.",
    );
    // No security effect is printed; nothing in the module may claim one.
    expect(definition.securityEffectText ?? "").toBe("");
  });

  it("compiles every printed clause and nothing else", () => {
    expect(compiled).toMatchObject({ cardId: CARD_ID, coverage: "full", residual: [] });
    expect(compiled.effects).toHaveLength(4);

    // ＜Collision＞ and ＜Blocker＞, in printed order.
    expect(compiled.effects[0]).toEqual({
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Collision", raw: "＜Collision＞" },
        { keyword: "Blocker", raw: "＜Blocker＞" },
      ],
    });

    // [All Turns] [Once Per Turn] When this Digimon suspends, reveal 3 ...
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              rest: "trash",
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    colors: ["Black"],
                    levelComparison: { op: "lte", value: 4 },
                    keywords: ["Blocker"],
                  },
                  count: 1,
                  to: "play",
                  optional: true,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(compiled.effects[1]!.isInherited).toBeUndefined();
    expect(compiled.effects[1]!.sharedUseKey).toBeUndefined();
    // "without paying the cost" is the full waiver, never a reduction.
    const mainReveal = (
      compiled.effects[1]!.actions[0] as {
        actions: { add: { costDelta?: number; totalPlayCostBudget?: number }[] }[];
      }
    ).actions[0]!;
    expect(mainReveal.add[0]!.costDelta).toBeUndefined();
    expect(mainReveal.add[0]!.totalPlayCostBudget).toBeUndefined();

    // [Rule] Trait: Has [Machine] Type.
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Machine"],
        },
      ],
    });

    // [Opponent's Turn] [Once Per Turn] When any of your Digimon suspend, play from hand ...
    expect(compiled.effects[3]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                filter: {
                  controllerDefault: "mine",
                  zone: "hand",
                  kind: ["Digimon"],
                  colors: ["Black"],
                  levelComparison: { op: "lte", value: 5 },
                  keywords: ["Blocker"],
                },
                count: 1,
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects[3]!.sharedUseKey).toBeUndefined();
    // "any of your Digimon", not "this Digimon": a bundled self-gate would make the rest of the
    // source filter inert (whenSuspendedSelfGate, interpreter/actions/subTrigger.ts).
    expect(compiled.effects[3]!.actions[0]).not.toMatchObject({ sourceFilter: { isSelfRef: true } });

    // The card prints no [Digivolve] / [Assembly] header and no [Security] clause.
    expect(compiled.digivolutionRequirement).toBeUndefined();
    expect(compiled.assemblyRequirement).toBeUndefined();
    expect(compiled.effects.some((effect) => effect.isSecurity === true)).toBe(false);

    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  // ---------------------------------------------------------------------------
  // [All Turns] [Once Per Turn] When this Digimon suspends, reveal the top 3 cards of your deck.
  // You may play 1 level 4 or lower black Digimon card with ＜Blocker＞ among them without paying
  // the cost. Trash the rest.
  // ---------------------------------------------------------------------------

  it("free-plays the revealed Lv.4 black ＜Blocker＞ and trashes the other two revealed cards", async () => {
    const s = setupEngine(
      revealBoard([
        { card: MATCH_LV4, as: "freePlay" },
        { card: NEAR_MATCH_KEYWORD, as: "nearMiss" },
        { card: SENTINEL, as: "nonMatch" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("giromon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === MATCH_LV4));
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    // Guardromon entered the battle area beside the suspended Giromon.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("giromon").instanceId, s.inst("freePlay").instanceId].sort(),
    );
    expect(s.perm("giromon").isSuspended).toBe(true);
    // "without paying the cost": Guardromon's printed play cost of 5 was waived entirely.
    expect(s.state.memory).toBe(0);
    // "Trash the rest" — the two unchosen revealed cards, and nothing else.
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("nearMiss").instanceId, s.inst("nonMatch").instanceId].sort(),
    );
    // Exactly 3 cards were revealed; the fourth stayed in the deck, and nothing reached hand.
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    assertNoLoudGap(s);
  });

  it("discriminates every printed predicate: refuses a near-match keyword, a keywordless black Lv.4, a purple ＜Blocker＞ and a Lv.5 black ＜Blocker＞", async () => {
    for (const rejected of [NEAR_MATCH_KEYWORD, NO_KEYWORD_BLACK, WRONG_COLOUR, MATCH_LV5]) {
      const s = setupEngine(
        revealBoard([
          { card: rejected, as: "rejected" },
          { card: SENTINEL, as: "filler" },
          { card: NEUTRAL, as: "alsoFiller" },
        ]),
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 0;
      await s.ready();

      await advance(s.engine).verb.suspend([s.perm("giromon").permanentId]);
      await settle(() => s.state.players[0]!.trash.length === 3);
      await settle(() => s.state.pendingDecision === undefined);
      await settle();

      // Nothing was playable, so all three revealed cards were trashed and the board is unchanged.
      expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
        [s.inst("rejected").instanceId, s.inst("filler").instanceId, s.inst("alsoFiller").instanceId].sort(),
      );
      expect(s.state.memory).toBe(0);
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
      expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("untouched").instanceId]);
      assertNoLoudGap(s);
    }
  });

  it("picks the Lv.3 match over two near misses standing beside it in the same reveal", async () => {
    const s = setupEngine(
      revealBoard([
        { card: WRONG_COLOUR, as: "purpleBlocker" },
        { card: MATCH_LV3, as: "freePlay" },
        { card: NO_KEYWORD_BLACK, as: "noKeyword" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("giromon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    // The automation had exactly one legal candidate, which is the point: the purple ＜Blocker＞ and
    // the keywordless black Lv.4 were never offered.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("giromon").instanceId, s.inst("freePlay").instanceId].sort(),
    );
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("purpleBlocker").instanceId, s.inst("noKeyword").instanceId].sort(),
    );
    assertNoLoudGap(s);
  });

  it('trashes all three when the printed "You may" is declined', async () => {
    // The optional `to: "play"` slot surfaces as a `selectCards` decision with `min: 0`, not an
    // `optional` prompt, so the decline is answered with an empty selection by hand.
    const s = setupEngine(
      revealBoard([
        { card: MATCH_LV4, as: "declined" },
        { card: MATCH_LV3, as: "alsoDeclined" },
        { card: SENTINEL, as: "filler" },
      ]),
    );
    s.state.memory = 0;
    await s.ready();

    const suspension = advance(s.engine).verb.suspend([s.perm("giromon").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds?: string[]; min?: number };
    expect([...(payload.candidateInstanceIds ?? [])].sort()).toEqual(
      [s.inst("declined").instanceId, s.inst("alsoDeclined").instanceId].sort(),
    );
    expect(payload.min ?? 0).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await suspension;
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("declined").instanceId, s.inst("alsoDeclined").instanceId, s.inst("filler").instanceId].sort(),
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    assertNoLoudGap(s);
  });

  it("fires on the OPPONENT's turn too, because the printed window is [All Turns]", async () => {
    const s = setupEngine(
      revealBoard([
        { card: MATCH_LV3, as: "freePlay" },
        { card: SENTINEL, as: "filler" },
        { card: NEUTRAL, as: "alsoFiller" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("giromon").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("giromon").instanceId, s.inst("freePlay").instanceId].sort(),
    );
    expect(s.state.memory).toBe(0);
  });

  it("ignores an ALLY suspending: the printed subject is this Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "giromon" },
            { card: NEUTRAL, as: "ally" },
          ],
          hand: [{ card: SPARE, as: "spare" }],
          deck: [{ card: MATCH_LV4, as: "wouldHavePlayed" }, SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { hand: [{ card: "BT1-012", as: "spareOpponent" }], deck: DECK, security: [SPARE] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();

    // Nothing was revealed, nothing was played, nothing was trashed.
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
    expect(s.perm("ally").isSuspended).toBe(true);
  });

  it("fires once per turn and rearms on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "giromon" }],
          hand: [{ card: SPARE, as: "spare" }],
          deck: [
            { card: MATCH_LV3, as: "firstPlay" },
            SENTINEL,
            SENTINEL,
            { card: MATCH_LV4, as: "secondPlay" },
            SENTINEL,
            SENTINEL,
            SENTINEL,
            SENTINEL,
            SENTINEL,
          ],
          security: [SENTINEL],
        },
        1: { hand: [{ card: "BT1-012", as: "spareOpponent" }], deck: Array(8).fill(SENTINEL), security: [SPARE] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const giromonId = s.perm("giromon").permanentId;

    await advance(s.engine).verb.suspend([giromonId]);
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(6);

    // Re-open a legal event in the SAME turn: the spent use does not come back.
    await advance(s.engine).verb.unsuspend([giromonId]);
    await advance(s.engine).verb.suspend([giromonId]);
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(6);

    // A real opponent turn, then the controller's own turn, restores the use.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;

    await advance(s.engine).verb.unsuspend([giromonId]);
    await advance(s.engine).verb.suspend([giromonId]);
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      [CARD_ID, MATCH_LV3, MATCH_LV4].sort(),
    );
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // ＜Collision＞ (§16-30) and ＜Blocker＞ (§16-4), both of which also drive the main clause:
  // declaring an attack and blocking each suspend this Digimon.
  // ---------------------------------------------------------------------------

  it("declares both keywords live, and the printed [Rule] Trait grants [Machine] on top of [Mine]", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "giromon" },
          { card: HOST, as: "sourceOnly", under: [CARD_ID] },
        ],
        hand: [{ card: SPARE, as: "spare" }],
        deck: DECK,
        security: [SENTINEL],
      },
      1: { deck: DECK, security: [SPARE] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("giromon"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("giromon"), "Blocker")).toBe(true);

    // The catalog prints only [Mine], so every [Machine] read comes from the printed Rule clause.
    expect(getCardDefinition(CARD_ID)?.types).toEqual(["Mine"]);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("giromon"), "Mine")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("giromon"), "Machine")).toBe(true);
    // A Digimon merely CARRYING this card as a digivolution card is granted nothing: the Rule
    // clause is the top card's own printed information (§4-23-2).
    expect(observe(s.engine).hasEffectiveTrait(s.perm("sourceOnly"), "Machine")).toBe(false);
  });

  it("is read as [Machine] by another card's trait-gated inherited grant", async () => {
    // EX1-007 Megadramon's inherited clause is "[Your Turn] While this Digimon has [Machine] in its
    // traits, it gains ＜Security Attack +1＞" — an INDEPENDENT reader of the trait, so the proof
    // does not rest on this module's own observation helper. Three hosts carry it: this card (trait
    // from its printed Rule clause only), BT15-061 Guardromon (printed [Machine] — the positive
    // control that the reader works at all) and BT1-014 Kokatorimon ([Bird] — the negative).
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "granted", under: ["EX1-007"] },
          { card: "BT15-061", as: "printedMachine", under: ["EX1-007"] },
          { card: HOST, as: "notMachine", under: ["EX1-007"] },
        ],
        hand: [{ card: SPARE, as: "spare" }],
        deck: DECK,
        security: [SENTINEL],
      },
      1: { deck: DECK, security: [SPARE] },
    });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("granted"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("printedMachine"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).keywordAmount(s.perm("notMachine"), "SecurityAttack")).toBe(0);
  });

  it("＜Collision＞ forces a non-＜Blocker＞ opponent Digimon to block, and the attack's own suspension fires the reveal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "giromon" }],
          hand: [{ card: SPARE, as: "spare" }],
          deck: [{ card: MATCH_LV3, as: "freePlay" }, SENTINEL, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { battleArea: [{ card: NEUTRAL, as: "forcedBlocker" }], deck: DECK, security: [SPARE] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const blockerId = s.perm("forcedBlocker").permanentId;
    // Muchomon has no printed ＜Blocker＞ of its own; ＜Collision＞ is the only reason it can block.
    expect(observe(s.engine).hasKeyword(blockerId, "Blocker")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("giromon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(s.events.find(({ kind }) => kind === "blockWindowOpened")).toMatchObject({
      mustBlock: true,
      eligibleBlockerIds: [blockerId],
    });
    // §16-30: the opponent is forced to block whenever possible.
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    // The block redirected the attack, so security was never checked, and the 7000 DP Giromon beat
    // the 5000 DP forced blocker.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // The attack declaration suspended Giromon, which is this card's own printed trigger.
    expect(s.perm("giromon").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("giromon").instanceId, s.inst("freePlay").instanceId].sort(),
    );
    expect(s.state.memory).toBe(0);
  });

  it("＜Blocker＞ intercepts an attack aimed at the player, and that suspension fires the reveal too", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NEUTRAL, as: "attacker" }],
          hand: [{ card: SPARE, as: "spare" }],
          deck: DECK,
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: CARD_ID, as: "giromon" }],
          hand: [{ card: "BT1-012", as: "spareOpponent" }],
          deck: [{ card: MATCH_LV4, as: "freePlay" }, SENTINEL, SENTINEL, SENTINEL],
          security: [SPARE, SPARE],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const combat = combatOf(s);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => combat.hasOpenBlockWindow);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("giromon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[1]!.battleArea.length === 2);
    await settle();

    // Security was untouched, the 7000 DP blocker beat the 5000 DP attacker, and the suspension the
    // block itself cost fired the reveal.
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("giromon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("giromon").instanceId, s.inst("freePlay").instanceId].sort(),
    );
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // [Opponent's Turn] [Once Per Turn] When any of your Digimon suspend, you may play 1 level 5 or
  // lower black Digimon card with ＜Blocker＞ from your hand without paying the cost.
  // ---------------------------------------------------------------------------

  /** A neutral host carrying this card as its only digivolution card, plus a hand to play from. */
  function inheritedBoard(hand: { card: string; as: string }[]) {
    return {
      0: {
        battleArea: [
          { card: HOST, as: "host", under: [{ card: CARD_ID, as: "giromonCard" }] },
          { card: NEUTRAL, as: "ally" },
        ],
        hand,
        deck: DECK,
        security: [SENTINEL],
      },
      1: { hand: [{ card: "BT1-012", as: "spareOpponent" }], deck: DECK, security: [SPARE] },
    };
  }

  it("free-plays a Lv.5 black ＜Blocker＞ from hand when an ally suspends on the opponent's turn", async () => {
    const s = setupEngine(
      inheritedBoard([
        { card: MATCH_LV5, as: "freePlay" },
        { card: SPARE, as: "spare" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    s.state.turnSeat = 1;
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual([CARD_ID]);

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle();

    // Andromon is level 5 — inside the inherited ceiling and outside the main clause's.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("freePlay").instanceId,
    );
    // "without paying the cost": Andromon's printed play cost of 7 was waived.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("fires for the HOST's own suspension too, since the host is one of your Digimon", async () => {
    const s = setupEngine(
      inheritedBoard([
        { card: MATCH_LV3, as: "freePlay" },
        { card: SPARE, as: "spare" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("freePlay").instanceId,
    );
  });

  it("refuses a Lv.6 ＜Blocker＞, a near-match keyword, a keywordless black Lv.4 and a purple ＜Blocker＞ in hand", async () => {
    const s = setupEngine(
      inheritedBoard([
        { card: MATCH_LV6, as: "tooHigh" },
        { card: NEAR_MATCH_KEYWORD, as: "nearMiss" },
        { card: NO_KEYWORD_BLACK, as: "noKeyword" },
        { card: WRONG_COLOUR, as: "purple" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();

    // Nothing in hand satisfies all four printed predicates, so the hand is untouched.
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does nothing on the controller's OWN turn: the printed window is [Opponent's Turn]", async () => {
    const s = setupEngine(
      inheritedBoard([
        { card: MATCH_LV5, as: "wouldHavePlayed" },
        { card: SPARE, as: "spare" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.state.turnSeat).toBe(0);

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("ignores the OPPONENT's Digimon suspending", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HOST, as: "host", under: [CARD_ID] }],
          hand: [
            { card: MATCH_LV5, as: "wouldHavePlayed" },
            { card: SPARE, as: "spare" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: {
          battleArea: [{ card: NEUTRAL, as: "theirs" }],
          hand: [{ card: "BT1-012", as: "spareOpponent" }],
          deck: DECK,
          security: [SPARE],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("theirs").permanentId]);
    await settle();

    // "any of YOUR Digimon" — the opponent's suspension is not this watcher's event.
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it('declines the printed "you may" and keeps the card in hand', async () => {
    const s = setupEngine(
      inheritedBoard([
        { card: MATCH_LV5, as: "declined" },
        { card: SPARE, as: "spare" },
      ]),
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId).sort()).toEqual(
      [s.inst("declined").instanceId, s.inst("spare").instanceId].sort(),
    );
  });

  it("fires once per opponent turn and rearms on the next one", async () => {
    const s = setupEngine(
      inheritedBoard([
        { card: MATCH_LV5, as: "firstPlay" },
        { card: MATCH_LV3, as: "secondPlay" },
        { card: SPARE, as: "spare" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const allyId = s.perm("ally").permanentId;

    await advance(s.engine).verb.suspend([allyId]);
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(2);

    // Same opponent turn: re-open the event and the spent use stays spent.
    await advance(s.engine).verb.unsuspend([allyId]);
    await advance(s.engine).verb.suspend([allyId]);
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.hand).toHaveLength(2);

    // A real turn of the controller's own passes, then the next opponent turn reopens the use.
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;

    await advance(s.engine).verb.unsuspend([allyId]);
    await advance(s.engine).verb.suspend([allyId]);
    await settle(() => s.state.players[0]!.battleArea.length === 4);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining([MATCH_LV5, MATCH_LV3]),
    );
    assertNoLoudGap(s);
  });

  it("does not install the inherited clause without this card in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HOST, as: "host", under: [SENTINEL] },
            { card: NEUTRAL, as: "ally" },
          ],
          hand: [
            { card: MATCH_LV5, as: "wouldHavePlayed" },
            { card: SPARE, as: "spare" },
          ],
          deck: DECK,
          security: [SENTINEL],
        },
        1: { hand: [{ card: "BT1-012", as: "spareOpponent" }], deck: DECK, security: [SPARE] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  // ---------------------------------------------------------------------------
  // Evolution: the catalog EvoCost (Black Lv.4 for 3) is the only printed route.
  // ---------------------------------------------------------------------------

  it("digivolves from a Black Lv.4 for 3 with the bonus draw, keeping the source identity, and refuses a Red Lv.4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MATCH_LV4, as: "source", under: [{ card: MATCH_LV3, as: "bottom" }] }],
          hand: [{ card: CARD_ID, as: "giromon" }],
          deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL, SENTINEL],
          security: [SENTINEL],
        },
        1: { hand: [{ card: "BT1-012", as: "spareOpponent" }], deck: DECK, security: [SPARE] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("giromon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);

    // Printed cost 3 was charged, and nothing reduced it.
    expect(s.state.memory).toBe(0);
    // `Permanent.stack` holds only the cards beneath the top card, bottom first.
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottom").instanceId,
      s.inst("source").instanceId,
    ]);
    // Digivolution's bonus draw moved exactly one deck card into hand.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    // Both keywords and the granted trait came with the new top card.
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Collision")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("source"), "Machine")).toBe(true);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: HOST, as: "source" }],
        hand: [{ card: CARD_ID, as: "giromon" }],
        deck: DECK,
        security: [SENTINEL],
      },
      1: { hand: [{ card: "BT1-012", as: "spareOpponent" }], deck: DECK, security: [SPARE] },
    });
    illegal.state.memory = 3;
    await illegal.ready();

    // Kokatorimon is a RED Lv.4: the right level, the wrong colour.
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("source").permanentId,
        instanceId: illegal.inst("giromon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.perm("source").topCard.cardId).toBe(HOST);
    expect(illegal.state.memory).toBe(3);
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      illegal.inst("giromon").instanceId,
    ]);
  });

  it("installs the main clause through a real digivolution, with the source card's identity intact", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MATCH_LV4, as: "source" }],
          hand: [{ card: CARD_ID, as: "giromon" }],
          deck: [
            { card: SENTINEL, as: "bonusDraw" },
            { card: MATCH_LV3, as: "freePlay" },
            SENTINEL,
            SENTINEL,
            SENTINEL,
          ],
          security: [SENTINEL],
        },
        1: { hand: [{ card: "BT1-012", as: "spareOpponent" }], deck: DECK, security: [SPARE] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("giromon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === CARD_ID);
    await settle(() => s.state.pendingDecision === undefined);

    await advance(s.engine).verb.suspend([s.perm("source").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle();

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId).sort()).toEqual(
      [s.inst("giromon").instanceId, s.inst("freePlay").instanceId].sort(),
    );
    // The Lv.4 source survives beneath the new top card.
    expect(s.perm("source").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("source").instanceId]);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
