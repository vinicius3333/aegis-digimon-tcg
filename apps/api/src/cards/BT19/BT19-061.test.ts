import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { digiXrosMatches } from "../../engine/combat/keywords.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

/**
 * BT19-061 RaptorSparrowmon — Black/Purple Lv.4 Champion, 5000 DP, play cost 5,
 * evo cost 3 from a Black or Purple Lv.3.
 *
 * Printed clauses:
 *   1. [Digivolve] Lv.3 w/[Xros Heart] trait: Cost 2                        (alternate route)
 *   2. This card is also treated as [Sparrowmon] for a DigiXros.            (main, Q3119)
 *   3. [On Play] [When Digivolving] Reveal the top 3 cards of your deck. Add 1 card with
 *      the [Xros Heart]/[Blue Flare] trait among them to the hand. Trash the rest. (main, Q3118)
 *   4. [On Deletion] Place 1 Digimon card with the [Xros Heart]/[Blue Flare] trait from
 *      your hand or trash under your Tamers.                                (main)
 *   5. [Your Turn] This Digimon with the [Xros Heart] trait gains ＜Collision＞. (inherited)
 *
 * KB (`node tools/kb/query.mjs card BT19-061`): Q3118, Q3119.
 */

const XROS_LV3 = "BT10-058"; // Monitamon: Black Lv.3 [Xros Heart] — the Cost 2 alternate source
const PLAIN_BLACK_LV3 = "BT2-052"; // Hagurumon: Black Lv.3, no traits of interest, no effects
const GREEN_LV3 = "BT1-064"; // Goblimon: Green Lv.3 — matches neither route
const XROS_MATCH = "BT19-055"; // Monitamon: Black Lv.3 [Xros Heart] — reveal/place candidate
const BLUE_FLARE_MATCH = "BT19-016"; // Gaossmon: Blue Lv.3 [Blue Flare] — the other printed trait
const MISS_A = "BT1-009"; // Monodramon: [Mini Dragon], inert
const MISS_B = "BT1-013"; // Muchomon: [Avian], inert
const MISS_C = "BT1-014"; // Kokatorimon: Lv.4 [Giant Bird], inert
const TAMER = "ST3-12"; // T.K. Takaishi — a Tamer with no effect that touches this flow
const XROS_HOST = "BT19-013"; // Shoutmon X5: Lv.5 [Xros Heart], no inherited effect of its own
const NON_XROS_HOST = "BT19-058"; // SkullKnightmon: [Undead]/[Twilight] — near-miss trait host
const INERT_SECURITY = "BT1-009";

describe("BT19-061 RaptorSparrowmon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-061")).toMatchObject({
      cardId: "BT19-061",
      nameEn: "RaptorSparrowmon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Cyborg", "Twilight", "Xros Heart"],
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      inheritedEffectText: "[Your Turn] This Digimon with the [Xros Heart] trait gains ＜Collision＞.",
    });
  });

  it("compiles every printed clause with no residual", () => {
    const card = runtimeCompiledCard("BT19-061");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      // "also treated as [Sparrowmon] for a DigiXros" is confined to the DigiXros ledger
      // (Q3119) and prints no timing bracket, so Static + digiXrosOnly.
      {
        trigger: "Static",
        actions: [
          {
            kind: "GrantStatic",
            grant: "name",
            tokens: ["Sparrowmon"],
            digiXrosOnly: true,
            target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          },
        ],
      },
      ...(["OnPlay", "WhenDigivolving"] as const).map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            // "with the [X]/[Y] trait" is an EXACT trait test, never a substring.
            add: [
              {
                count: 1,
                to: "hand",
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }],
                },
              },
            ],
            rest: "trash",
          },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlaceUnder",
            target: {
              count: 1,
              from: ["hand", "trash"],
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }],
              },
            },
            underFilter: { controller: "mine", kind: ["Tamer"] },
          },
        ],
      },
      // Printed "[Your Turn]" is the YourTurn trigger, not Static.
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            effect: { kind: "keyword", keyword: { keyword: "Collision" } },
            target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
            while: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] } },
          },
        ],
      },
    ]);
    expect(card?.effects).toHaveLength(5);
    expect(card?.digivolutionRequirement).toEqual([{ level: 3, traits: ["Xros Heart"], cost: 2, isAlternate: true }]);
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.3 w/[Xros Heart] trait: Cost 2
  // ---------------------------------------------------------------------------

  it("offers the Cost 2 route only to a Lv.3 with the exact [Xros Heart] trait", () => {
    expect(matchingAlternateDigivolutionRequirement("BT19-061", XROS_LV3)).toMatchObject({ cost: 2 });
    // Black Lv.3 without the trait: only the printed evo cost of 3 remains.
    expect(matchingAlternateDigivolutionRequirement("BT19-061", PLAIN_BLACK_LV3)).toBeUndefined();
    // Right trait, wrong level (Lv.5 [Xros Heart]).
    expect(matchingAlternateDigivolutionRequirement("BT19-061", XROS_HOST)).toBeUndefined();
    expect(matchingAlternateDigivolutionRequirement("BT19-061", GREEN_LV3)).toBeUndefined();
  });

  it.each([
    ["Cost 2 [Xros Heart] alternate route", XROS_LV3, 2, 0],
    ["printed Cost 3 colour route", PLAIN_BLACK_LV3, 3, undefined],
  ])("digivolves through the %s and fires When Digivolving", async (_label, baseCardId, cost, alternateIndex) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "BT19-061", as: "raptor" }],
          // The evolution draw takes the top card first; the reveal then sees the next 3.
          deck: [{ card: MISS_C, as: "evoDraw" }, { card: XROS_MATCH, as: "match" }, MISS_A, MISS_B],
          security: [{ card: INERT_SECURITY }],
        },
        1: { security: [{ card: INERT_SECURITY }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = cost;
    await s.ready();
    const baseId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("raptor").instanceId,
        ...(alternateIndex === undefined ? {} : { alternateRequirementIndex: alternateIndex }),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId));

    // The gauge started at exactly the route's cost, so the route actually paid is pinned.
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-061");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    // Reveal 3 (match + 2 misses), add the match, trash the rest; the evolution draw is the 4th.
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual([MISS_C, XROS_MATCH].sort());
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([MISS_A, MISS_B]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("refuses an illegal source that matches neither the trait route nor the printed colours", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_LV3, as: "goblimon" }],
          hand: [{ card: "BT19-061", as: "raptor" }],
          deck: [MISS_A, MISS_B, MISS_C],
          security: [{ card: INERT_SECURITY }],
        },
        1: { security: [{ card: INERT_SECURITY }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    for (const intent of [{}, { alternateRequirementIndex: 0 }, { useAlternateCost: true }]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("goblimon").permanentId,
          instanceId: s.inst("raptor").instanceId,
          ...intent,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-061"]);
    expect(s.perm("goblimon").topCard?.cardId).toBe(GREEN_LV3);
  });

  // ---------------------------------------------------------------------------
  // [On Play] Reveal the top 3 cards of your deck. Add 1 card with the
  // [Xros Heart]/[Blue Flare] trait among them to the hand. Trash the rest. (Q3118)
  // ---------------------------------------------------------------------------

  it.each([
    ["[Xros Heart]", XROS_MATCH],
    ["[Blue Flare]", BLUE_FLARE_MATCH],
  ])("adds the revealed %s card on play and trashes the other two", async (_label, matchCardId) => {
    // `autoDeclineOptional` is deliberate: the add is MANDATORY (Q3118 — you must add as many
    // as possible), so no optional prompt exists for the decline to reach.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-061", as: "raptor" }, { card: MISS_C }],
          deck: [MISS_A, { card: matchCardId, as: "match" }, MISS_B, { card: MISS_C, as: "bottom" }],
          security: [{ card: INERT_SECURITY }],
        },
        1: { security: [{ card: INERT_SECURITY }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raptor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual([MISS_C, matchCardId].sort());
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual([MISS_A, MISS_B].sort());
    // Only the top 3 were touched; the 4th card stays on the deck.
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds nothing when no revealed card carries either printed trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-061", as: "raptor" }, { card: MISS_C }],
          // [Mini Dragon], [Avian] and [Giant Bird]: three near-miss traits, none of them the
          // printed pair, so every revealed card is trashed.
          deck: [MISS_A, MISS_B, MISS_C],
          security: [{ card: INERT_SECURITY }],
        },
        1: { security: [{ card: INERT_SECURITY }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raptor").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.length === 3);
    await drainMicrotasks(40);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([MISS_C]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual([MISS_A, MISS_B, MISS_C].sort());
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] Place 1 Digimon card with the [Xros Heart]/[Blue Flare] trait from your
  // hand or trash under your Tamers.
  // ---------------------------------------------------------------------------

  it("places a matching Digimon card from its own trash under its own Tamer when it dies in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-061", as: "raptor" },
            { card: TAMER, as: "tamer" },
          ],
          hand: [{ card: MISS_A, as: "nonMatchingHand" }],
          trash: [{ card: BLUE_FLARE_MATCH, as: "blueFlare" }],
          security: [{ card: INERT_SECURITY }],
        },
        1: {
          battleArea: [{ card: MISS_A, as: "wall", dp: 20_000, suspended: true }],
          trash: [{ card: XROS_MATCH, as: "opponentXros" }],
          security: [{ card: INERT_SECURITY }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raptor").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 1);

    // Only the controller's own [Blue Flare] card qualified: the [Mini Dragon] card in hand
    // and the opponent's own [Xros Heart] card in THEIR trash are both near misses.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("blueFlare").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("nonMatchingHand").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-061"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("opponentXros").instanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([TAMER]);
  });

  it("places nothing when the controller has no Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-061", as: "raptor" }],
          trash: [{ card: BLUE_FLARE_MATCH, as: "blueFlare" }],
          security: [{ card: INERT_SECURITY }],
        },
        1: {
          battleArea: [{ card: MISS_A, as: "wall", dp: 20_000, suspended: true }],
          security: [{ card: INERT_SECURITY }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("raptor").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await drainMicrotasks(40);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([BLUE_FLARE_MATCH, "BT19-061"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // "This card is also treated as [Sparrowmon] for a DigiXros." — Q3119
  // ---------------------------------------------------------------------------

  it("is a legal [Sparrowmon] DigiXros material while keeping its printed name", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT10-013", as: "x5" },
          { card: "BT10-008", as: "shoutmon" },
          { card: "BT10-049", as: "ballistamon" },
          { card: "BT10-034", as: "dorulumon" },
          { card: "BT10-029", as: "starmons" },
          { card: "BT19-061", as: "raptor" },
        ],
        battleArea: [{ card: "BT19-061", as: "boardRaptor" }],
        security: [{ card: INERT_SECURITY }],
      },
      1: { security: [{ card: INERT_SECURITY }] },
    });
    await s.ready();

    // The alias never reaches ordinary name matching.
    expect(observe(s.engine).effectiveNames(s.perm("boardRaptor"))).toEqual(["raptorsparrowmon"]);
    expect(observe(s.engine).grantedNames(s.perm("boardRaptor"))).toEqual([]);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("x5").instanceId,
        digiXros: {
          materialInstanceIds: [
            s.inst("shoutmon").instanceId,
            s.inst("ballistamon").instanceId,
            s.inst("dorulumon").instanceId,
            s.inst("starmons").instanceId,
            s.inst("raptor").instanceId,
          ],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-013"));

    expect(s.perm("x5").stack.map((card) => card.instanceId)).toContain(s.inst("raptor").instanceId);
  });

  it("is not a ＜Material Save＞-eligible [Sparrowmon] under a Tamer (Q3119)", async () => {
    // The DigiXros-only alias is invisible to the eligibility test ＜Material Save＞ uses.
    expect(digiXrosMatches("BT10-013", "BT19-061")).toBe(false);
    expect(digiXrosMatches("BT10-013", "BT10-060")).toBe(true);

    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-013", as: "x5", dp: 6000, under: ["BT19-061", "BT10-060", "BT10-049"] },
            { card: TAMER, as: "tamer" },
          ],
          security: [{ card: INERT_SECURITY }],
        },
        1: {
          battleArea: [{ card: MISS_A, as: "wall", dp: 20_000, suspended: true }],
          security: [{ card: INERT_SECURITY }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("x5").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length > 0);

    // ＜Material Save 3＞ moved the real [Sparrowmon] and [Ballistamon]; RaptorSparrowmon was
    // never eligible and went to the trash with the rest of the stack.
    expect(
      s
        .perm("tamer")
        .stack.map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT10-049", "BT10-060"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-061");
  });

  // ---------------------------------------------------------------------------
  // Inherited [Your Turn] This Digimon with the [Xros Heart] trait gains ＜Collision＞.
  // ---------------------------------------------------------------------------

  it("grants inherited ＜Collision＞ only to an [Xros Heart] host, and only on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: XROS_HOST, as: "xrosHost", under: ["BT19-061"] },
          { card: NON_XROS_HOST, as: "plainHost", under: ["BT19-061"] },
        ],
        hand: [{ card: MISS_A }],
        deck: [MISS_A, MISS_B],
        security: [{ card: INERT_SECURITY }],
      },
      1: {
        hand: [{ card: MISS_A }],
        deck: [MISS_A, MISS_B],
        security: [{ card: INERT_SECURITY }],
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Identical stack shape; only the host's printed traits differ.
    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Collision")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // [Your Turn] only: the grant is gone once the turn hands over.
    expect(s.state.turnSeat).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Collision")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Collision")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("forces the opponent to block through the inherited ＜Collision＞ (§16-30)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: XROS_HOST, as: "xrosHost", under: ["BT19-061"] },
            { card: NON_XROS_HOST, as: "plainHost", under: ["BT19-061"] },
          ],
          security: [{ card: INERT_SECURITY }],
        },
        1: {
          // Inert Lv.3 with no printed ＜Blocker＞: it can only block if ＜Collision＞ grants it.
          battleArea: [{ card: MISS_A, as: "nonBlocker" }],
          security: [{ card: INERT_SECURITY }, { card: INERT_SECURITY }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    // Near-miss control first: the [Undead]/[Twilight] host gets no grant, so the same
    // non-Blocker is not even an eligible blocker.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plainHost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("xrosHost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened && "eligibleBlockerIds" in opened ? opened.eligibleBlockerIds : []).toContain(
      s.perm("nonBlocker").permanentId,
    );
    expect(opened && "mustBlock" in opened ? opened.mustBlock : undefined).toBe(true);
    // "the opponent player is forced to block whenever possible" — a decline is illegal.
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("nonBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
