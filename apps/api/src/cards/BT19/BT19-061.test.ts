import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { digiXrosMatches } from "../../engine/combat/keywords.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const XROS_LV3 = "BT10-058";
const PLAIN_BLACK_LV3 = "BT2-052";
const GREEN_LV3 = "BT1-064";
const XROS_MATCH = "BT19-055";
const BLUE_FLARE_MATCH = "BT19-016";
const MISS_A = "BT1-009";
const MISS_B = "BT1-013";
const MISS_C = "BT1-014";
const TAMER = "ST3-12";
const XROS_HOST = "BT19-013";
const NON_XROS_HOST = "BT19-058";
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

  it("offers the Cost 2 route only to a Lv.3 with the exact [Xros Heart] trait", () => {
    expect(matchingAlternateDigivolutionRequirement("BT19-061", XROS_LV3)).toMatchObject({ cost: 2 });
    expect(matchingAlternateDigivolutionRequirement("BT19-061", PLAIN_BLACK_LV3)).toBeUndefined();
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

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard?.cardId).toBe("BT19-061");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
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

  it.each([
    ["[Xros Heart]", XROS_MATCH],
    ["[Blue Flare]", BLUE_FLARE_MATCH],
  ])("adds the revealed %s card on play and trashes the other two", async (_label, matchCardId) => {
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
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds nothing when no revealed card carries either printed trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-061", as: "raptor" }, { card: MISS_C }],
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

    expect(
      s
        .perm("tamer")
        .stack.map((card) => card.cardId)
        .sort(),
    ).toEqual(["BT10-049", "BT10-060"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT19-061");
  });

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

    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Collision")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

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
          battleArea: [{ card: MISS_A, as: "nonBlocker" }],
          security: [{ card: INERT_SECURITY }, { card: INERT_SECURITY }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

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
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("nonBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
