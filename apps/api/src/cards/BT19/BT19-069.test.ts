import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import "./BT19-069.js";

// BT19-069 Deltamon (Purple/Black, Lv.4 Champion/Virus/[Composite], DP 5000, play 5,
// EvoCost Purple Lv.3 / Black Lv.3 for 3).
//   [Digivolve][Gazimon]/[Gizamon]: Cost 2
//   [On Play] [When Digivolving] [On Deletion] By trashing 1 card in your hand, delete 1 of
//     your opponent's level 4 or lower Digimon.
//   Inherited: ＜Blocker＞.
//
// KB: `node tools/kb/query.mjs card BT19-069` reports no knowledge-base entries, so no Q&A id
// is owed for this card. The rules used here are the generic ones: a "by X," processing
// condition is declinable (comprehensive 15-7-4) and ＜Blocker＞ is 16-1.
//
// Fixtures. Inert main-deck Digimon only (no Digi-Eggs anywhere):
//   BT10-071 Gazimon — Purple Lv.3, the exact [Gazimon] route AND a legal normal Purple Lv.3 base.
//   BT19-066 Gizamon — Purple/Black Lv.3, the exact [Gizamon] route and a legal normal base.
//   BT9-070 "Gazimon (X Antibody)" — Purple Lv.3. The near-miss peer: a SUBSTRING name gate
//     would take it for [Gazimon]; the printed bracketed name is exact, so it must fall back
//     to the normal Purple Lv.3 route and only the memory delta (3, not 2) shows it.
//   BT1-009 Monodramon — Red Lv.3: the illegal source (wrong colour, wrong name).
const inertDeck = ["BT1-009", "BT1-013", "BT1-012", "BT1-014"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-012"];

describe("BT19-069 Deltamon", () => {
  it("matches the catalog printing, evolution costs and inherited text", () => {
    expect(getCardDefinition("BT19-069")).toMatchObject({
      cardId: "BT19-069",
      nameEn: "Deltamon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Composite"],
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      inheritedEffectText: "＜Blocker＞.",
    });
    const printed = getCardDefinition("BT19-069")!.effectText!;
    expect(printed).toContain("[Digivolve][Gazimon]/[Gizamon]: Cost 2");
    expect(printed).toContain(
      "[On Play] [When Digivolving] [On Deletion] By trashing 1 card in your hand, delete 1 of your opponent's level 4 or lower Digimon.",
    );
  });

  it("compiles the three timings, the exact-name route and the inherited keyword", () => {
    const card = runtimeCompiledCard("BT19-069");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving", "OnDeletion"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Delete",
            target: {
              count: 1,
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            },
            cost: { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } },
            optional: true,
          },
        ],
      })),
      { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Blocker" }] },
    ]);
    // The bracketed `[Gazimon]/[Gizamon]` route is EXACT: `names` is the substring gate.
    expect(card?.digivolutionRequirement).toEqual([{ namesExact: ["Gazimon", "Gizamon"], cost: 2, isAlternate: true }]);
  });

  // ---------------------------------------------------------------------------
  // [On Play]
  // ---------------------------------------------------------------------------

  it("[On Play] trashes the chosen hand card and deletes the level-4 Digimon, sparing the level 5", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-069", as: "deltamon" },
            { card: "BT1-013", as: "fodder" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "level4" },
            { card: "BT19-070", as: "level5" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("fodder").instanceId, s.perm("level4").topCard!.instanceId);
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deltamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    // Play cost 5 paid from 8.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-069"]);
    // Exactly the chosen hand card was trashed; the spare stayed in hand.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("fodder").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    // "level 4 or lower": the Lv.5 peer survives.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-070"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[On Play] declining the 'by trashing' condition deletes nothing and keeps the hand (15-7-4)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-069", as: "deltamon" },
            { card: "BT1-013", as: "fodder" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "level4" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deltamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("fodder").instanceId, s.inst("spare").instanceId].sort(),
    );
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does nothing when the opponent has only level-5-or-higher Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-069", as: "deltamon" },
            { card: "BT1-013", as: "fodder" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "BT19-070", as: "level5" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deltamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle();

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT19-070"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // Evolution routes
  // ---------------------------------------------------------------------------

  it("[Digivolve][Gazimon] costs 2 and fires [When Digivolving]", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "gazimon" }],
          hand: [
            { card: "BT19-069", as: "deltamon" },
            { card: "BT1-013", as: "fodder" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "BT1-014", as: "level4" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("fodder").instanceId, s.perm("level4").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();

    const gazimonId = s.inst("gazimon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gazimon").permanentId,
        instanceId: s.inst("deltamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    // Cost 2 through the printed alternate route, not the 3 of the normal Purple Lv.3 EvoCost.
    expect(s.state.memory).toBe(8);
    expect(s.perm("gazimon").topCard?.cardId).toBe("BT19-069");
    expect(s.perm("gazimon").stack.map((card) => card.instanceId)).toEqual([gazimonId]);
    // [When Digivolving] resolved: the fodder paid, the Lv.4 died.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("fodder").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Digivolve][Gizamon] costs 2 from the Purple/Black Lv.3 Gizamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-066", as: "gizamon" }],
          hand: [{ card: "BT19-069", as: "deltamon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const gizamonId = s.inst("gizamon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gizamon").permanentId,
        instanceId: s.inst("deltamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gizamon").topCard?.cardId === "BT19-069");
    await settle();

    expect(s.state.memory).toBe(8);
    expect(s.perm("gizamon").stack.map((card) => card.instanceId)).toEqual([gizamonId]);
    // The digivolve bonus draw: the top of the inert deck, and nothing else.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([inertDeck[0]]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(inertDeck.slice(1));
  });

  it("uses the normal Purple Lv.3 EvoCost of 3 when the alternate route is not requested", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-071", as: "gazimon" }],
          hand: [{ card: "BT19-069", as: "deltamon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gazimon").permanentId,
        instanceId: s.inst("deltamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gazimon").topCard?.cardId === "BT19-069");
    await settle();

    expect(s.state.memory).toBe(7);
  });

  it("refuses the exact [Gazimon] route to the near-miss peer 'Gazimon (X Antibody)'", async () => {
    // `useAlternateCost: true` with no matching alternate route silently falls back to the
    // normal route and still answers {ok:true}: only the memory delta discriminates. A
    // SUBSTRING `names` gate would have charged 2 here.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-070", as: "xAntibody" }],
          hand: [{ card: "BT19-069", as: "deltamon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const sourceId = s.inst("xAntibody").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("xAntibody").permanentId,
        instanceId: s.inst("deltamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("xAntibody").topCard?.cardId === "BT19-069");
    await settle();

    expect(s.state.memory).toBe(7);
    expect(s.perm("xAntibody").stack.map((card) => card.instanceId)).toEqual([sourceId]);
  });

  it("refuses an illegal source: a Red Lv.3 that is neither Gazimon nor Gizamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "monodramon" }],
          hand: [{ card: "BT19-069", as: "deltamon" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("monodramon").permanentId,
          instanceId: s.inst("deltamon").instanceId,
          useAlternateCost,
        }).ok,
      ).toBe(false);
    }

    expect(s.perm("monodramon").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("monodramon").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("deltamon").instanceId]);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion]
  // ---------------------------------------------------------------------------

  it("[On Deletion] fires after a real battle loss and deletes the chosen level-4 Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-069", as: "deltamon" }],
          hand: [
            { card: "BT1-013", as: "fodder" },
            { card: "BT1-012", as: "spare" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "wall", dp: 20_000, suspended: true },
            { card: "BT1-014", as: "level4" },
          ],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.inst("fodder").instanceId, s.perm("level4").topCard!.instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deltamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settle();

    // 5000 DP into a 20 000 DP wall: Deltamon is deleted, and its [On Deletion] resolves.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT19-069"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("spare").instanceId]);
    // The chosen Lv.4 died; the Lv.3 wall it fought is untouched.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Inherited ＜Blocker＞ under a real host
  // ---------------------------------------------------------------------------

  it("grants ＜Blocker＞ to the host it sits under, which really blocks, while a bare peer may not", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-070", as: "host", dp: 20_000, under: ["BT19-069"] },
            { card: "BT19-070", as: "plainHost", dp: 20_000 },
          ],
          hand: [{ card: "BT1-012", as: "spare" }],
          deck: inertDeck,
          security: inertSecurity,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker" }],
          hand: [{ card: "BT1-012", as: "opponentSpare" }],
          deck: inertDeck,
          security: inertSecurity,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    // Reach the OPPONENT's real turn through the turn loop rather than assigning turnSeat.
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Blocker")).toBe(false);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("plainHost").permanentId }).ok,
    ).toBe(false);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle();

    // Security untouched, the 5000 DP attacker lost to the 20 000 DP blocker.
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(inertSecurity);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "BT19-070",
      "BT19-070",
    ]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
