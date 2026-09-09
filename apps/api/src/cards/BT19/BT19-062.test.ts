import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

/**
 * BT19-062 Cyberdramon — Black Lv.5 Ultimate, 9000 DP, play cost 7,
 * evo cost 4 from a Black Lv.4.
 *
 * Printed clauses:
 *   1. [Digivolve][Strikedramon]: Cost 3                                    (alternate route)
 *   2. ＜Rush＞                                                              (main)
 *   3. ＜Collision＞                                                         (main)
 *   4. [When Attacking] Trash 1 of your Option cards in the battle area.    (main, Q3120/Q3121)
 *   5. [End of Your Turn] If your opponent has an unsuspended Digimon, this Digimon attacks
 *      a player.                                                            (main, Q3122/Q3123)
 *   6. ＜Collision＞                                                         (inherited)
 *
 * KB (`node tools/kb/query.mjs card BT19-062`): Q3120, Q3121, Q3122, Q3123.
 */

const STRIKEDRAMON = "BT19-060"; // the exact printed [Strikedramon] — Black Lv.4, 5000 DP
const OTHER_STRIKEDRAMON = "EX2-032"; // a second printing of the same name
const BLACK_LV4 = "BT10-062"; // Golemon: Black Lv.4, inert — the printed colour route only
const RED_LV4 = "BT1-014"; // Kokatorimon: Red Lv.4, inert — illegal source
const OPTION = "BT19-093"; // Queen Device: an Option that places itself in the battle area
const INERT_LV3 = "BT1-009"; // Monodramon: Lv.3, no keywords
const INERT_LV3_B = "BT1-013"; // Muchomon: Lv.3, no keywords
const XROS_HOST = "BT19-013"; // Shoutmon X5: Lv.5, no inherited effect of its own
const INERT_SECURITY = "BT1-009";

describe("BT19-062 Cyberdramon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition("BT19-062")).toMatchObject({
      cardId: "BT19-062",
      nameEn: "Cyberdramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 9000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg"],
      evoCosts: [{ color: "Black", level: 4, memoryCost: 4 }],
      inheritedEffectText: "＜Collision＞.",
    });
  });

  it("compiles every printed clause with no residual", () => {
    const card = runtimeCompiledCard("BT19-062");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Rush" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Collision" }] },
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Trash",
            target: {
              count: 1,
              // "your Option cards in the battle area": only Options the controller placed
              // there through a "place this card in the battle area" effect (Q3120).
              filter: {
                zone: "battleArea",
                controller: "mine",
                kind: ["Option"],
                placedInBattleAreaByEffect: true,
              },
            },
          },
        ],
      },
      {
        trigger: "EndOfYourTurn",
        actions: [
          {
            kind: "Attack",
            attackPlayer: true,
            target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
            condition: {
              kind: "opponentHas",
              filter: { controllerDefault: "opponent", unsuspended: true, kind: ["Digimon"] },
            },
          },
        ],
      },
      { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Collision" }] },
    ]);
    expect(card?.effects).toHaveLength(5);
    // The printed route names [Strikedramon] in brackets: an EXACT name gate, so a future
    // "[Strikedramon] in its name" relative cannot answer it (the `names` substring form would).
    expect(card?.digivolutionRequirement).toEqual([{ namesExact: ["Strikedramon"], cost: 3, isAlternate: true }]);
  });

  // ---------------------------------------------------------------------------
  // [Digivolve][Strikedramon]: Cost 3
  // ---------------------------------------------------------------------------

  it("offers the Cost 3 route to every printing named [Strikedramon] and to nothing else", () => {
    expect(matchingAlternateDigivolutionRequirement("BT19-062", STRIKEDRAMON)).toMatchObject({ cost: 3 });
    expect(matchingAlternateDigivolutionRequirement("BT19-062", OTHER_STRIKEDRAMON)).toMatchObject({ cost: 3 });
    // Same colour and level, different name: only the printed evo cost of 4 remains.
    expect(matchingAlternateDigivolutionRequirement("BT19-062", BLACK_LV4)).toBeUndefined();
    expect(matchingAlternateDigivolutionRequirement("BT19-062", RED_LV4)).toBeUndefined();
  });

  it.each([
    ["Cost 3 [Strikedramon] route", STRIKEDRAMON, 3, 0],
    ["printed Cost 4 Black Lv.4 route", BLACK_LV4, 4, undefined],
  ])("digivolves through the %s", async (_label, baseCardId, cost, alternateIndex) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "BT19-062", as: "cyber" }],
          deck: [{ card: INERT_LV3_B, as: "evoDraw" }, INERT_LV3],
          security: [{ card: INERT_SECURITY }],
        },
        1: { security: [{ card: INERT_SECURITY }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = cost;
    await s.ready();
    const baseId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cyber").instanceId,
        ...(alternateIndex === undefined ? {} : { alternateRequirementIndex: alternateIndex }),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-062");

    // The gauge started at exactly the route's cost, so the route actually paid is pinned.
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    // Stack proof: Strikedramon's inherited [All Turns] +1000 DP rides under the new top card.
    expect(s.perm("base").currentDP).toBe(baseCardId === STRIKEDRAMON ? 10_000 : 9000);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("refuses a Red Lv.4 source: neither the name route nor the printed Black colour", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: RED_LV4, as: "kokatorimon" }],
          hand: [{ card: "BT19-062", as: "cyber" }],
          deck: [INERT_LV3, INERT_LV3_B],
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
          permanentId: s.perm("kokatorimon").permanentId,
          instanceId: s.inst("cyber").instanceId,
          ...intent,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-062"]);
  });

  // ---------------------------------------------------------------------------
  // ＜Rush＞
  // ---------------------------------------------------------------------------

  it("attacks the turn it is played, where a fresh non-＜Rush＞ peer is refused", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-062", as: "cyber" },
            { card: BLACK_LV4, as: "peer" },
          ],
          deck: [INERT_LV3],
          security: [{ card: INERT_SECURITY }],
        },
        1: { security: [{ card: INERT_SECURITY }, { card: INERT_SECURITY }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("peer").instanceId })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyber").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    const peer = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === BLACK_LV4)!;
    const cyber = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT19-062")!;
    // Same turn, same arrival: only the ＜Rush＞ holder may declare.
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: peer.permanentId, target: { kind: "player" } }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: cyber.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(cyber.isSuspended).toBe(true);
    expect(peer.isSuspended).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // ＜Collision＞ (main and inherited) — Comprehensive Rules §16-30
  // ---------------------------------------------------------------------------

  it("forces the opponent to block, where a peer without ＜Collision＞ does not", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-062", as: "cyber" },
            { card: BLACK_LV4, as: "peer" },
          ],
          security: [{ card: INERT_SECURITY }],
        },
        1: {
          // No printed ＜Blocker＞: it can only block if ＜Collision＞ grants it.
          battleArea: [{ card: INERT_LV3, as: "nonBlocker" }],
          security: [{ card: INERT_SECURITY }, { card: INERT_SECURITY }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("cyber"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("peer"), "Collision")).toBe(false);

    // Negative control first: the plain Black Lv.4 opens no block window at all.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("peer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cyber").permanentId,
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
    // The forced block spent the blocker and saved the second security card.
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("passes ＜Collision＞ down as an inherited effect under a real host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: XROS_HOST, as: "host", under: ["BT19-062"] },
            { card: XROS_HOST, as: "bare" },
          ],
          security: [{ card: INERT_SECURITY }],
        },
        1: {
          battleArea: [{ card: INERT_LV3, as: "nonBlocker" }],
          security: [{ card: INERT_SECURITY }, { card: INERT_SECURITY }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    // Identical printed top cards; only the digivolution card underneath differs.
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("bare"), "Collision")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened && "mustBlock" in opened ? opened.mustBlock : undefined).toBe(true);
    expect(s.engine.applyIntent(1, { type: "declineBlock" }).ok).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // [When Attacking] Trash 1 of your Option cards in the battle area. (Q3120, Q3121)
  // ---------------------------------------------------------------------------

  it("must trash its controller's effect-placed Option, and never the opponent's", async () => {
    // `autoDeclineOptional` is deliberate: Q3121 makes the trash mandatory, so there is no
    // optional prompt for the decline to reach.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: OPTION, as: "queen" }],
          battleArea: [{ card: "BT19-062", as: "cyber" }],
          security: [{ card: INERT_SECURITY }],
        },
        1: {
          // An Option seeded onto the battle area is `placedByEffect` by default (§17-1-3-2-2):
          // the near-miss here is its CONTROLLER, not how it got there.
          battleArea: [{ card: OPTION, as: "opponentOption" }],
          security: [{ card: INERT_SECURITY }, { card: INERT_SECURITY }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === OPTION));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cyber").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === OPTION));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("queen").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-062"]);
    // The opponent's Option is untouched: the filter is controller-scoped.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([OPTION]);
    // Their trash holds only the security card this attack checked, never their Option.
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("opponentOption").instanceId);
    expect(s.perm("cyber").isSuspended).toBe(true);
  });

  it("attacks normally when it controls no Option in the battle area", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-062", as: "cyber" }], security: [{ card: INERT_SECURITY }] },
        1: { security: [{ card: INERT_SECURITY }, { card: INERT_SECURITY }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cyber").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await drainMicrotasks(40);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // [End of Your Turn] If your opponent has an unsuspended Digimon, this Digimon attacks a
  // player. (Q3122, Q3123)
  // ---------------------------------------------------------------------------

  it("attacks the player at the end of its controller's turn (Q3122)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-062", as: "cyber" }],
          hand: [INERT_LV3],
          deck: [INERT_LV3_B, INERT_LV3],
          security: [{ card: INERT_SECURITY }],
        },
        1: {
          battleArea: [{ card: INERT_LV3, as: "opponent" }],
          security: [{ card: INERT_SECURITY }, { card: INERT_SECURITY }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    // ＜Collision＞ still applies to the forced attack, so the block window opens and compels.
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened && "mustBlock" in opened ? opened.mustBlock : undefined).toBe(true);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("opponent").permanentId }),
    ).toEqual({ ok: true });
    await turn;

    const declared = s.events.filter((event) => event.kind === "attackDeclared" && "attackerPermanentId" in event) as {
      attackerPermanentId: string;
      target: { kind: string };
    }[];
    expect(declared).toHaveLength(1);
    expect(declared[0]).toMatchObject({
      attackerPermanentId: s.perm("cyber").permanentId,
      target: { kind: "player" },
    });
    expect(s.perm("cyber").isSuspended).toBe(true);
    // The forced block resolved the battle: 9000 beat the 3000 blocker, security untouched.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("does not attack when the opponent's only Digimon is suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-062", as: "cyber" }],
          hand: [INERT_LV3],
          deck: [INERT_LV3_B, INERT_LV3],
          security: [{ card: INERT_SECURITY }],
        },
        1: {
          battleArea: [{ card: INERT_LV3, as: "opponent", suspended: true }],
          security: [{ card: INERT_SECURITY }, { card: INERT_SECURITY }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.perm("cyber").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("only lets the first of two copies attack (Q3123)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-062", as: "first" },
            { card: "BT19-062", as: "second" },
          ],
          hand: [INERT_LV3],
          deck: [INERT_LV3_B, INERT_LV3],
          security: [{ card: INERT_SECURITY }],
        },
        1: {
          battleArea: [{ card: INERT_LV3, as: "opponent", dp: 20_000 }],
          security: [{ card: INERT_SECURITY }, { card: INERT_SECURITY }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("opponent").permanentId }),
    ).toEqual({ ok: true });
    await turn;

    // "A new attack declaration can't be made during an attack" — the second copy's effect may
    // activate, but it cannot produce a second attack.
    const declared = s.events.filter((event) => event.kind === "attackDeclared");
    expect(declared).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
