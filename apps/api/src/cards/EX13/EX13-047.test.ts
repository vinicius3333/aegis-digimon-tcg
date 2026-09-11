import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-047.js";

const CARD_ID = "EX13-047";

// Reveal fixtures, chosen so each slot is proven to DISCRIMINATE rather than merely fire:
//   BT1-084  Omnimon      — ["Holy Warrior","Royal Knight"], no ＜Blocker＞ anywhere: slot 1 only.
//   BT20-047 Solarmon     — ["Machine"], printed text is exactly "＜Blocker＞.": slot 2 only.
//   BT13-040 Magnamon     — ["Holy Warrior","Royal Knight"] AND printed ＜Blocker＞: qualifies for
//                           both slots, so it proves one card cannot fill both.
//   BT1-079  Lillymon     — prints ＜Blocker＞ ONLY in its inherited effect, which official manual
//                           §1 counts as part of "with XX in its text": slot 2.
//   BT18-044 FunBeemon    — ["Insectoid","X Antibody","Royal Base"]: the trait near-match. A
//                           containment reading of [Royal Knight] would still reject it, but a
//                           containment reading of "Royal" would not — and it carries no
//                           ＜Blocker＞, so it must stay in the deck.
//   BT13-016 SaviorHuckmon — names the [Royal Knight] trait inside its inherited TEXT but does not
//                           have the trait: the trait-vs-text near-match.
//   BT1-009 / BT1-013     — inert Digimon with no printed text at all: plain non-matches.
const ROYAL_KNIGHT = "BT1-084";
const BLOCKER = "BT20-047";
const ROYAL_KNIGHT_BLOCKER = "BT13-040";
const INHERITED_BLOCKER = "BT1-079";
const NEAR_TRAIT = "BT18-044";
const TEXT_ONLY_KNIGHT = "BT13-016";
const INERT = "BT1-009";

const inertDeck = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];

describe("EX13-047 Gotsumon", () => {
  it("matches the catalog and the complete IR contract", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "EX13",
      nameEn: "Gotsumon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 3000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Rock"],
      inheritedEffectText: "[Opponent's Turn] This Digimon gets +2000 DP.",
    });
    const effectText = getCardDefinition(CARD_ID)?.effectText ?? "";
    expect(effectText).toContain("＜Blocker＞");
    expect(effectText).toContain(
      "[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Royal Knight] trait and 1 card with ＜Blocker＞ among them to the hand. Return the rest to the bottom of the deck.",
    );
    expect(effectText).toContain("[When Attacking] Lose 2 memory.");

    expect(compiled.effects[0]).toEqual({
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
              count: 1,
              to: "hand",
            },
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Blocker"], match: "text" }] },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "GainMemory", amount: -2 }],
    });
    expect(compiled.effects[2]!.condition).toBeUndefined();
    expect(compiled.effects[3]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
    });
    expect(compiled.effects).toHaveLength(4);
    expect(compiled).toMatchObject({ cardId: CARD_ID, coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Royal Knight] trait and
  // 1 card with ＜Blocker＞ among them to the hand. Return the rest to the bottom of the deck.
  // ---------------------------------------------------------------------------

  it("reveals exactly 3, adds one [Royal Knight] and one ＜Blocker＞ card, and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gotsumon" }],
          deck: [
            { card: ROYAL_KNIGHT, as: "knight" },
            { card: BLOCKER, as: "blocker" },
            { card: INERT, as: "rest" },
            { card: "BT1-013", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("knight").instanceId, s.inst("blocker").instanceId]),
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("rest").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.memory).toBe(2);
    // Exactly the two printed add slots prompted, and nothing else.
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(2);
    assertNoLoudGap(s);
  });

  // The slots are per category, not a pooled union: a single card matching BOTH qualifiers is
  // consumed by the first slot and cannot also satisfy the second.
  it("lets one [Royal Knight] ＜Blocker＞ card fill a single slot while a second card fills the other", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gotsumon" }],
          deck: [
            { card: ROYAL_KNIGHT_BLOCKER, as: "both" },
            { card: BLOCKER, as: "blocker" },
            { card: INERT, as: "rest" },
            { card: "BT1-013", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("both").instanceId, s.inst("blocker").instanceId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("rest").instanceId,
    ]);
  });

  // The mirror case: the ONLY qualifying card is the dual one, so exactly one card is added —
  // a pooled-union reading would still take one, but a "one per qualifier" reading would wrongly
  // take it twice, and a slot-2-first reading would leave it for the blocker slot.
  it("adds the dual card exactly once when it is the only match", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gotsumon" }],
          deck: [
            { card: ROYAL_KNIGHT_BLOCKER, as: "both" },
            { card: INERT, as: "firstRest" },
            { card: "BT1-013", as: "secondRest" },
            { card: "BT1-010", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("both").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("firstRest").instanceId,
      s.inst("secondRest").instanceId,
    ]);
  });

  // Official manual §1: "with XX in its text" spans the INHERITED effect too, so a card whose
  // only ＜Blocker＞ icon sits in its inherited line qualifies for the second slot.
  it("accepts a card whose only ＜Blocker＞ icon sits in its inherited effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gotsumon" }],
          deck: [
            { card: INHERITED_BLOCKER, as: "inheritedBlocker" },
            { card: INERT, as: "firstRest" },
            { card: "BT1-013", as: "secondRest" },
            { card: "BT1-010", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("inheritedBlocker").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  // The exact-trait reading, proven to discriminate: [Royal Base] shares the word "Royal" and
  // SaviorHuckmon names the [Royal Knight] trait inside its own text, yet neither HAS the trait,
  // and neither prints ＜Blocker＞ — so all three revealed cards go to the bottom untouched.
  it("rejects a [Royal Base] card and a card that only names [Royal Knight] in its text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gotsumon" }],
          deck: [
            { card: NEAR_TRAIT, as: "royalBase" },
            { card: TEXT_ONLY_KNIGHT, as: "textOnly" },
            { card: INERT, as: "inert" },
            { card: "BT1-013", as: "unrevealed" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("unrevealed").instanceId,
      s.inst("royalBase").instanceId,
      s.inst("textOnly").instanceId,
      s.inst("inert").instanceId,
    ]);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });

  it("returns all three revealed cards to the bottom when nothing matches", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "gotsumon" }],
          deck: [
            { card: INERT, as: "first" },
            { card: "BT1-013", as: "second" },
            { card: "BT1-010", as: "third" },
          ],
        },
      },
      { autoOrderCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gotsumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.every(({ faceUp }) => !faceUp));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
    ]);
    expect(s.state.memory).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // ＜Blocker＞
  // ---------------------------------------------------------------------------

  it("opens a real block window and intercepts an attack with ＜Blocker＞", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: INERT, as: "attacker", dp: 1000 }], deck: inertDeck },
      1: { battleArea: [{ card: CARD_ID, as: "gotsumon" }], security: ["BT1-013"], deck: inertDeck },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gotsumon"), "Blocker")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("gotsumon").permanentId],
    });

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("gotsumon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    // The 1000 DP attacker loses to 3000 DP, the blocker survives, and the security stack the
    // attack was aimed at is untouched.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("gotsumon").permanentId,
    ]);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // [When Attacking] Lose 2 memory.
  // ---------------------------------------------------------------------------

  it("loses 2 memory on its own public attack, with no condition on the target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "gotsumon" }], deck: inertDeck },
      // BT1-011 Agumon Expert is a 1000 DP security Digimon with no Security effect, so the
      // security battle is decided by DP alone and Gotsumon survives to be inspected.
      1: { security: [{ card: "BT1-011", as: "topSecurity" }], deck: inertDeck },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gotsumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("gotsumon").permanentId,
    ]);
    expect(s.perm("gotsumon").isSuspended).toBe(true);
    // The attack performed its single security check: the revealed card was trashed.
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("topSecurity").instanceId]);
    assertNoLoudGap(s);
  });

  it("also loses 2 memory when attacking a Digimon, and charges the loss once per attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "gotsumon", dp: 20_000 }], deck: inertDeck },
      1: { battleArea: [{ card: INERT, as: "victim", suspended: true }], security: ["BT1-013"], deck: inertDeck },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gotsumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // A Digimon battle performs no security check.
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Evolution routes: the catalog Black Lv.2 EvoCost for 0
  // ---------------------------------------------------------------------------

  it("digivolves for 0 from a black level-2 Digi-Egg and rejects an off-color egg", async () => {
    const eligible = setupEngine({
      0: {
        breeding: { card: "BT2-005", as: "blackEgg" },
        hand: [{ card: CARD_ID, as: "gotsumon" }],
        deck: inertDeck,
      },
    });
    eligible.state.memory = 0;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("blackEgg").permanentId,
        instanceId: eligible.inst("gotsumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("blackEgg").topCard.instanceId === eligible.inst("gotsumon").instanceId);

    // Digivolving is not playing, so the [On Play] reveal stays silent: the only card leaving the
    // deck is the single digivolution bonus draw, and the cost was 0.
    expect(eligible.state.memory).toBe(0);
    expect(eligible.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([inertDeck[0]]);
    expect(eligible.state.players[0]!.deck).toHaveLength(inertDeck.length - 1);
    expect(eligible.perm("blackEgg").stack.map(({ cardId }) => cardId)).toEqual(["BT2-005"]);
    expect(eligible.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);

    const ineligible = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "redEgg" },
        hand: [{ card: CARD_ID, as: "gotsumon" }],
        deck: inertDeck,
      },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("redEgg").permanentId,
        instanceId: ineligible.inst("gotsumon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  // ---------------------------------------------------------------------------
  // [Inherited] [Opponent's Turn] This Digimon gets +2000 DP.
  // ---------------------------------------------------------------------------

  it("survives as a source card under a level-4 Digimon and keeps its inherited line live", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "host" }],
        hand: [{ card: "BT2-056", as: "numemon" }],
        deck: inertDeck,
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("numemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("numemon").instanceId);

    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    expect(s.perm("host").topCard.cardId).toBe("BT2-056");
    expect(s.state.memory).toBe(4);
    // The host's printed ＜Blocker＞ is gone with Gotsumon buried, and the [When Attacking]
    // memory loss with it — only the inherited line survives the transition.
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
    expect(s.perm("host").currentDP).toBe(getCardDefinition("BT2-056")!.dp);
  });

  it("grants inherited +2000 DP only during the opponent's turn, across real turn boundaries", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-056", as: "host", under: [CARD_ID] }],
        hand: [{ card: INERT, as: "spare" }],
        deck: inertDeck,
        security: ["BT1-013"],
      },
      1: { deck: inertDeck, security: ["BT1-013", "BT1-010"] },
    });
    const base = getCardDefinition("BT2-056")!.dp!;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(base);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(base + 2000);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(base);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // The inherited clause is the SOURCE card's, not the top card's: a Gotsumon standing on its own
  // in the battle area gets no +2000 DP on the opponent's turn (its own printed text grants none).
  it("does not buff itself on the opponent's turn while it is the top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "gotsumon" }],
        hand: [{ card: INERT, as: "spare" }],
        deck: inertDeck,
        security: ["BT1-013"],
      },
      1: { deck: inertDeck, security: ["BT1-013"] },
    });
    const base = getCardDefinition(CARD_ID)!.dp!;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("gotsumon").currentDP).toBe(base);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("gotsumon").currentDP).toBe(base);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
