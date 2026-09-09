import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

// Fixtures (inert main-deck Digimon only; no Digi-Egg may sit in a deck or in security):
//   BT1-009 Monodramon      Lv3 Red  3000, no text        — deck/security filler
//   BT1-013 Muchomon        Lv3 Red  5000, no text        — deck/security filler
//   BT1-064 Goblimon        Lv3 Green 3000, no text       — legal Green Lv3 evolution source
//   BT2-052 Hagurumon       Lv3 Black 3000, no text       — legal Black Lv3 evolution source
//   BT1-071 Vegiemon        Lv4 Green 6000, no text       — ILLEGAL source (Lv4) / non-Xros host
//   BT19-051 AtlurBallistamon  Lv5 Green/Black, Xros Heart — the exact [AtlurBallistamon]
//   BT10-049 Ballistamon       Lv4 Green,  Xros Heart     — NAME NEAR MISS: "Ballistamon" is a
//            substring of "AtlurBallistamon", so a substring gate would wrongly accept it
//   BT19-081 Kiriha Aonuma     Blue Tamer                 — the Tamer the sources sit under
const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009"];

describe("BT19-047 Ballistamon", () => {
  it("matches the catalog print", () => {
    expect(getCardDefinition("BT19-047")).toMatchObject({
      cardId: "BT19-047",
      nameEn: "Ballistamon",
      colors: ["Green", "Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Machine", "Xros Heart"],
      evoCosts: [
        { color: "Green", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      effectText:
        "[On Play] This Digimon may digivolve into [AtlurBallistamon] under your Tamers without paying the cost.\n[On Deletion] ＜Save＞.",
      inheritedEffectText: "[Opponent's Turn] This Digimon with the [Xros Heart]\u00A0trait gains ＜Blocker＞.",
    });
  });

  it("compiles the bracketed name as an EXACT gate, ＜Save＞ as a keyword and the inherited clause on the opponent's turn", () => {
    const compiled = runtimeCompiledCard("BT19-047");
    expect(compiled?.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          // "[AtlurBallistamon]" is bracketed, so the gate must be exact, never a substring.
          into: { nameOrTrait: [{ tokens: ["AtlurBallistamon"], match: "nameExact" }] },
          from: ["digivolutionCardsUnderTamers"],
          payCost: false,
          optional: true,
        },
      ],
    });
    // ＜Save＞ must carry the keyword so `withSavePlacementDefaults` puts the card at the
    // BOTTOM of the Tamer's stack (CR 4-3-2 / comprehensive 16-20-3, optional).
    expect(compiled?.effects[1]).toMatchObject({
      trigger: "OnDeletion",
      keywords: [{ keyword: "Save" }],
      actions: [{ kind: "PlaceUnder", optional: true, underFilter: { controller: "mine", kind: ["Tamer"] } }],
    });
    expect(compiled?.effects[2]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Blocker" } },
          // "with the [Xros Heart] trait" is an EXACT trait match, not `traitContains`.
          while: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] } },
        },
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // [On Play] This Digimon may digivolve into [AtlurBallistamon] under your Tamers
  // without paying the cost.
  // ---------------------------------------------------------------------------

  it("digivolves into the AtlurBallistamon under a Tamer for free on a public play, drawing the bonus card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-081", as: "tamer", under: ["BT19-051"] }],
          hand: [{ card: "BT19-047", as: "ballista" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const atlurId = s.state.players[0]!.battleArea[0]!.stack[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ballista").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-051"));
    await drainMicrotasks(80);

    const evolved = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-051")!;
    expect(evolved.topCard!.instanceId).toBe(atlurId);
    // The played Ballistamon became the single digivolution card beneath it.
    expect(evolved.stack.map((card) => card.instanceId)).toEqual([s.inst("ballista").instanceId]);
    // The Tamer gave up its saved card and holds nothing else.
    expect(s.perm("tamer").stack).toHaveLength(0);
    // Only the play cost of 4 was paid; the digivolution itself was free.
    expect(s.state.memory).toBe(6);
    // Digivolving still draws the bonus card.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("refuses the substring near miss [Ballistamon] and only takes the exact [AtlurBallistamon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-081", as: "tamer", under: ["BT10-049"] }],
          hand: [{ card: "BT19-047", as: "ballista" }],
          deck: [{ card: "BT1-014", as: "spare" }, ...DECK],
          security: SECURITY,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const nearMissId = s.state.players[0]!.battleArea[0]!.stack[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ballista").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-047"));
    await drainMicrotasks(120);

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT19-047")!;
    expect(played.stack).toHaveLength(0);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([nearMissId]);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["under the controller's own Digimon", 0 as const],
    ["under the opponent's Tamer", 1 as const],
  ])("ignores an AtlurBallistamon that is not under one of YOUR Tamers (%s)", async (_label, seat) => {
    const s = setupEngine(
      {
        0: {
          battleArea:
            seat === 0
              ? [{ card: "BT1-071", as: "holder", under: ["BT19-051"] }]
              : [{ card: "BT19-081", as: "ownTamer" }],
          hand: [{ card: "BT19-047", as: "ballista" }],
          deck: [{ card: "BT1-014", as: "spare" }, ...DECK],
          security: SECURITY,
        },
        1: {
          battleArea: seat === 1 ? [{ card: "BT19-081", as: "holder", under: ["BT19-051"] }] : [],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const atlurId = s.perm("holder").stack[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ballista").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-047"));
    await drainMicrotasks(120);

    expect(s.perm("holder").stack.map((card) => card.instanceId)).toEqual([atlurId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-051")).toBe(false);
  });

  it("leaves the Tamer's saved card alone when the optional digivolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-081", as: "tamer", under: ["BT19-051"] }],
          hand: [{ card: "BT19-047", as: "ballista" }],
          deck: [{ card: "BT1-014", as: "spare" }, ...DECK],
          security: SECURITY,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const atlurId = s.perm("tamer").stack[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ballista").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT19-047"));
    await drainMicrotasks(120);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([atlurId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(6);
  });

  // ---------------------------------------------------------------------------
  // Evolution routes: Green Lv.3 cost 3 / Black Lv.3 cost 3, and an illegal source.
  // ---------------------------------------------------------------------------

  it.each([
    ["Green Lv.3", "BT1-064"],
    ["Black Lv.3", "BT2-052"],
  ])("digivolves from a %s source for 3 memory, stacking the source and drawing 1", async (_label, sourceCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: sourceCard, as: "base" }],
          hand: [{ card: "BT19-047", as: "ballista" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ballista").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-047");
    await drainMicrotasks(80);

    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
  });

  it("refuses an illegal source (Green Lv.4, no printed route from Lv.4)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-071", as: "base" }],
          hand: [{ card: "BT19-047", as: "ballista" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { security: SECURITY, deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ballista").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard?.cardId).toBe("BT1-071");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT19-047"]);
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] ＜Save＞.
  // ---------------------------------------------------------------------------

  it("places the deleted Ballistamon at the BOTTOM of a Tamer's stack after a real battle loss", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-047", as: "ballista" },
            { card: "BT19-081", as: "tamer", under: [{ card: "BT19-051", as: "alreadySaved" }] },
          ],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ballista").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 2);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // CR 4-3-2 / comprehensive 16-21-6: the new card goes to the BOTTOM of the stack.
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([
      s.inst("ballista").instanceId,
      s.inst("alreadySaved").instanceId,
    ]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-047")).toBe(false);
  });

  it("trashes the Digimon instead when the optional ＜Save＞ is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-047", as: "ballista" },
            { card: "BT19-081", as: "tamer" },
          ],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          security: SECURITY,
          deck: DECK,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ballista").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("ballista").instanceId));
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("ballista").instanceId]);
  });

  // ---------------------------------------------------------------------------
  // Inherited: [Opponent's Turn] This Digimon with the [Xros Heart] trait gains ＜Blocker＞.
  // ---------------------------------------------------------------------------

  it("gives a real Xros Heart host ＜Blocker＞ that actually blocks on the opponent's real turn, but not a non-Xros host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-051", as: "xrosHost", under: [{ card: "BT19-047", as: "inherited" }] },
            { card: "BT1-071", as: "plainHost", dp: 20_000, under: ["BT19-047"] },
          ],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "attacker", dp: 3000 }],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    // Our own turn: the clause is scoped to the opponent's turn, so neither host has it.
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Blocker")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);

    // The opponent's real turn: only the [Xros Heart] host gains it.
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Blocker")).toBe(false);

    // Prove the keyword by its rules consequence: a real block of a real attack.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() !== undefined || observe(s.engine).isAttacking());
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("xrosHost").permanentId }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // The blocker took the attack: 7000 vs 3000, so the attacker died and no security was checked.
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-013")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(SECURITY.length);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("xrosHost").permanentId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not grant ＜Blocker＞ to an Xros Heart Digimon without BT19-047 in its digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-051", as: "xrosHost", under: ["BT10-049"] }],
          hand: ["BT1-013"],
          deck: DECK,
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker" }], hand: ["BT1-013"], deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("xrosHost"), "Blocker")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
