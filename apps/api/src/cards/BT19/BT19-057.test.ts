import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

/**
 * BT19-057 Sparrowmon — Black/Purple Lv.3 Rookie, 2000 DP, play cost 4,
 * evo cost 1 from a Black or Purple Lv.2.
 *
 * Printed clauses:
 *   1. [Digivolve] Lv.2 w/[Twilight]/[Xros Heart] trait: Cost 0            (alternate route)
 *   2. [When Attacking] This Digimon may digivolve into [RaptorSparrowmon]
 *      under your Tamers without paying the cost.                          (main)
 *   3. [On Deletion] ＜Save＞                                               (main, CR 16-20 / 4-3-2)
 *   4. [Your Turn] This Digimon with the [Xros Heart] trait gains ＜Collision＞ (inherited, CR 16-30)
 *
 * KB (`node tools/kb/query.mjs card BT19-057`): Q3117 — using the [When Attacking]
 * digivolve into a [RaptorSparrowmon] with the [Xros Heart] trait DOES activate the
 * ＜Collision＞ from this card's inherited effect, because ＜Collision＞ is already
 * active while the Digimon carrying it is attacking.
 */

const RAPTOR = "BT19-061"; // RaptorSparrowmon: Black/Purple Lv.4, Twilight + Xros Heart
const TAMER = "BT19-086"; // Ryo Akiyama: Black Tamer
const XROS_LV2_BLACK = "BT10-005"; // Monimon: Black Lv.2 Digi-Egg, Twilight + Xros Heart
const XROS_LV2_YELLOW = "BT10-003"; // Pickmons: YELLOW Lv.2 Digi-Egg, Xros Heart — off-color
const PLAIN_LV2_YELLOW = "BT1-005"; // Kyaromon: Yellow Lv.2 Digi-Egg, Lesser only
const PLAIN_LV2_BLACK = "BT11-005"; // Koromon: Black Lv.2 Digi-Egg, Lesser only — near-miss peer
const BLACK_LV3 = "BT2-052"; // Hagurumon: Black Lv.3 — wrong level for the alternate route
const NON_XROS_LV4 = "BT19-046"; // Chamblemon: Green Lv.4, no Xros Heart trait
const PLAIN_OPPONENT = "BT1-014"; // Kokatorimon: Red Lv.4, 4000 DP, no ＜Blocker＞
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
            // Bracketed [RaptorSparrowmon] is an EXACT name gate, not a substring one.
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
    // "w/[Twilight]/[Xros Heart] trait" is an OR over exact traits, gated to Lv.2, cost 0.
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

    // Cost 0, not the printed evo cost of 1 — the memory delta is what discriminates the route.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.breeding?.stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-055"]); // the digivolve draw
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

    // Yellow is neither printed evo color, so the ONLY route onto this base is the
    // trait-gated one. The engine selects it without the explicit flag; the cost proves which
    // route ran (the normal Black/Purple route would have been refused outright).
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

    // `useAlternateCost: true` with no matching alternate route silently uses the normal
    // route, so only the memory delta proves the trait gate held.
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

    // The attacking permanent kept its identity; Sparrowmon is now its digivolution card.
    expect(s.perm("sparrow").topCard?.cardId).toBe(RAPTOR);
    expect(s.perm("sparrow").stack.map((card) => card.instanceId)).toEqual([sparrowId]);
    expect(s.perm("tamer").stack).toHaveLength(0);
    // "without paying the cost": no memory moved for the digivolve.
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
    // Only "under your Tamers" is a source: the hand copy stays in hand.
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
    // ＜Collision＞ (CR 16-30-1): every opponent Digimon gains ＜Blocker＞ and the block is forced.
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

    // [Your Turn] + "with the [Xros Heart] trait": the Green host under the same card misses.
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
