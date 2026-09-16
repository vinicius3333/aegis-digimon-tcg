import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const RAPTOR = "BT19-061";
const TAMER = "BT19-086";
const XROS_LV2_BLACK = "BT10-005";
const XROS_LV2_YELLOW = "BT10-003";
const PLAIN_LV2_YELLOW = "BT1-005";
const PLAIN_LV2_BLACK = "BT11-005";
const BLACK_LV3 = "BT2-052";
const NON_XROS_LV4 = "BT19-046";
const PLAIN_OPPONENT = "BT1-014";
const INERT_SECURITY = "BT1-009";
const DECK = ["BT19-055", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-012"];

describe("BT19-057 Sparrowmon", () => {
  it("matches the catalog printing and compiles all four clauses with no residual", () => {
    expect(getCardDefinition("BT19-057")).toMatchObject({
      cardId: "BT19-057",
      nameEn: "Sparrowmon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 2000,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Avian", "Twilight", "Xros Heart"],
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
    });
    expect(getCardDefinition("BT19-057")!.inheritedEffectText!.replace(/\u00a0/g, " ")).toBe(
      "[Your Turn] This Digimon with the [Xros Heart] trait gains ＜Collision＞.",
    );
    const printed = getCardDefinition("BT19-057")!.effectText!;
    expect(printed.replace(/\u00a0/g, " ")).toContain("[Digivolve]Lv.2 w/[Twilight]/[Xros Heart] trait: Cost 0");
    expect(printed.replace(/\u00a0/g, " ")).toContain(
      "[When Attacking] This Digimon may digivolve into [RaptorSparrowmon] under your Tamers without paying the cost.",
    );
    expect(printed.replace(/\u00a0/g, " ")).toContain("[On Deletion] ＜Save＞.");

    const card = runtimeCompiledCard("BT19-057");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Digivolve",
            target: { filter: { isSelfRef: true }, isSelf: true },
            into: { nameOrTrait: [{ tokens: ["RaptorSparrowmon"], match: "nameExact" }] },
            from: ["digivolutionCardsUnderTamers"],
            payCost: false,
            optional: true,
          },
        ],
      },
      {
        trigger: "OnDeletion",
        keywords: [{ keyword: "Save" }],
        actions: [{ kind: "PlaceUnder", underFilter: { controller: "mine", kind: ["Tamer"] }, optional: true }],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [
          {
            kind: "Aura",
            target: { filter: { isSelfRef: true }, isSelf: true },
            effect: { kind: "keyword", keyword: { keyword: "Collision" } },
            while: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] } },
          },
        ],
      },
    ]);
    expect(card?.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Twilight", "Xros Heart"], cost: 0, isAlternate: true },
    ]);
  });

  it("takes the printed Cost 0 route off a Black Lv.2 with both named traits", async () => {
    const s = setupEngine({
      0: { breeding: { card: XROS_LV2_BLACK, as: "base" }, hand: [{ card: "BT19-057", as: "sparrow" }], deck: DECK },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 0;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const sparrowId = s.inst("sparrow").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sparrowId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === sparrowId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-055"]);
  });

  it("takes the Cost 0 route off an OFF-COLOR Lv.2 that carries the [Xros Heart] trait", async () => {
    const s = setupEngine({
      0: { breeding: { card: XROS_LV2_YELLOW, as: "base" }, hand: [{ card: "BT19-057", as: "sparrow" }], deck: DECK },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 3;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const sparrowId = s.inst("sparrow").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sparrowId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === sparrowId);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([baseId]);
  });

  it("ILLEGAL SOURCE: an off-color Lv.2 WITHOUT either named trait is refused by both routes", async () => {
    const s = setupEngine({
      0: { breeding: { card: PLAIN_LV2_YELLOW, as: "base" }, hand: [{ card: "BT19-057", as: "sparrow" }], deck: DECK },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 3;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const sparrowId = s.inst("sparrow").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sparrowId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sparrowId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([sparrowId]);
    expect(s.state.memory).toBe(3);
  });

  it("NEAR-MISS PEER: a Black Lv.2 without either trait falls back to the normal route and costs 1", async () => {
    const s = setupEngine({
      0: { breeding: { card: PLAIN_LV2_BLACK, as: "base" }, hand: [{ card: "BT19-057", as: "sparrow" }], deck: DECK },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 3;
    await s.ready();
    const sparrowId = s.inst("sparrow").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sparrowId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === sparrowId);

    expect(s.state.memory).toBe(2);
  });

  it("ILLEGAL SOURCE: a Black Lv.3 base is refused by both the normal and the alternate route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: BLACK_LV3, as: "base" }],
        hand: [{ card: "BT19-057", as: "sparrow" }],
        deck: DECK,
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
    });
    s.state.memory = 5;
    await s.ready();
    const sparrowId = s.inst("sparrow").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sparrowId,
        useAlternateCost: true,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: sparrowId,
      }),
    ).not.toEqual({ ok: true });

    expect(s.perm("base").topCard?.cardId).toBe(BLACK_LV3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([sparrowId]);
    expect(s.state.memory).toBe(5);
  });

  it("[When Attacking] digivolves into the [RaptorSparrowmon] under your Tamer for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow", dp: 20_000 },
            { card: TAMER, as: "tamer", under: [{ card: RAPTOR, as: "raptor" }] },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const sparrowId = s.perm("sparrow").topCard!.instanceId;
    const raptorId = s.inst("raptor").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sparrow").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sparrow").topCard?.instanceId === raptorId);

    expect(s.perm("sparrow").topCard?.cardId).toBe(RAPTOR);
    expect(s.perm("sparrow").stack.map((card) => card.instanceId)).toEqual([sparrowId]);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
  });

  it("may decline the attack digivolve, leaving the RaptorSparrowmon under the Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow", dp: 20_000 },
            { card: TAMER, as: "tamer", under: [{ card: RAPTOR, as: "raptor" }] },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sparrowId = s.perm("sparrow").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sparrow").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("sparrow").topCard?.instanceId).toBe(sparrowId);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("raptor").instanceId]);
  });

  it("NEAR-MISS: neither a differently named card under the Tamer nor a RaptorSparrowmon in hand is a legal source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow", dp: 20_000 },
            { card: TAMER, as: "tamer", under: [{ card: "BT19-058", as: "skull" }] },
          ],
          hand: [{ card: RAPTOR, as: "handRaptor" }],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sparrowId = s.perm("sparrow").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sparrow").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => false, 60);

    expect(s.perm("sparrow").topCard?.instanceId).toBe(sparrowId);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([s.inst("skull").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("handRaptor").instanceId);
  });

  it("Q3117: the attack digivolve into an [Xros Heart] RaptorSparrowmon turns on inherited ＜Collision＞ mid-attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow", dp: 20_000 },
            { card: TAMER, as: "tamer", under: [{ card: RAPTOR, as: "raptor" }] },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: PLAIN_OPPONENT, as: "nonBlocker" }],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const nonBlockerId = s.perm("nonBlocker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sparrow").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "blockWindowOpened"));

    expect(s.perm("sparrow").topCard?.cardId).toBe(RAPTOR);
    expect(observe(s.engine).hasKeyword(s.perm("sparrow"), "Collision")).toBe(true);
    const opened = s.events.find((e) => e.kind === "blockWindowOpened");
    const eligible = opened !== undefined && "eligibleBlockerIds" in opened ? opened.eligibleBlockerIds : [];
    expect(eligible).toContain(nonBlockerId);
    expect(opened !== undefined && "mustBlock" in opened ? opened.mustBlock : undefined).toBe(true);
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
  });

  it("NEGATIVE CONTROL: declining the attack digivolve leaves no ＜Collision＞ and no block window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow", dp: 20_000 },
            { card: TAMER, as: "tamer", under: [{ card: RAPTOR, as: "raptor" }] },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: PLAIN_OPPONENT, as: "nonBlocker" }],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sparrow").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("sparrow").topCard?.cardId).toBe("BT19-057");
    expect(s.events.some((e) => e.kind === "blockWindowOpened")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonBlocker"), "Blocker")).toBe(false);
  });

  it("＜Save＞ places the deleted Sparrowmon at the BOTTOM of one of YOUR Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow", dp: 20_000 },
            { card: TAMER, as: "tamer", under: [{ card: "BT19-058", as: "beneath" }] },
          ],
          deck: DECK,
        },
        1: {
          battleArea: [{ card: "BT19-083", as: "opponentTamer" }],
          security: [{ card: INERT_SECURITY, as: "sec" }],
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const selfId = s.perm("sparrow").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("sparrow").permanentId], "byEffect");
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === selfId));

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([selfId, s.inst("beneath").instanceId]);
    expect(s.perm("opponentTamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === selfId)).toBe(false);
  });

  it("＜Save＞ is optional: declining leaves the card in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-057", as: "sparrow", dp: 20_000 },
            { card: TAMER, as: "tamer" },
          ],
          deck: DECK,
        },
        1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const selfId = s.perm("sparrow").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("sparrow").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === selfId));

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([selfId]);
  });

  it("inherited ＜Collision＞ reaches only an [Xros Heart] host, and only on its controller's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: RAPTOR, as: "xrosHost", under: ["BT19-057"] },
          { card: NON_XROS_LV4, as: "plainHost", under: ["BT19-057"] },
        ],
        deck: DECK,
        security: [{ card: INERT_SECURITY, as: "own" }],
      },
      1: { security: [{ card: INERT_SECURITY, as: "sec" }], deck: DECK },
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
});
