import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT19-075.js";

// BT19-075 MoonMillenniummon — Purple Lv.7 Mega/Virus/[Wicked God], DP 15000, play cost 15,
// EvoCost Purple Lv.6 for 5.
//   [Digivolve][Millenniummon]: Cost 2
//   [On Play] [When Digivolving] Your opponent trashes cards in their hand until they have 5
//     left. For every 2 cards trashed by this effect, delete 1 of your opponent's Tamers.
//   [All Turns] When this Digimon would leave the battle area, by deleting 1 of your Digimon
//     with the [Composite] trait Digimon, it doesn't leave.
//   [All Turns] [Once Per Turn] When other Digimon or Tamers are deleted, trash your
//     opponent's top security card.
//
// KB Q3135 (2024-09-20): "Which player chooses the cards to trash in the hand for this card's
//   [On Play] [When Digivolving] effect?" — "Your opponent chooses and trashes the cards in
//   their hand." Covered by the `chooser: "opponent"` IR field and by asserting the
//   selection decision is routed to seat 1.
//
// Fixtures — inert cards only; no peer module is imported, so every peer contributes nothing
// but its catalog identity:
//   BT1-009 Monodramon    Lv3 Red    3000, no text — filler; NON-[Composite] near miss
//   BT1-013 Muchomon      Lv3 Red    5000, no text — filler / spare hand card / plain attacker
//   BT2-067 DemiDevimon   Lv3 Purple 3000, no text — ILLEGAL digivolve source
//   BT3-089 Boltmon       Lv6 Purple 12000, no text — legal PRINTED EvoCost base (cost 5)
//   BT18-019 Millenniummon  Lv7 Red/Black 14000 — legal EXACT-name alternate base (cost 2)
//   BT19-101 ZeedMillenniummon Lv7 Red/Purple/Black — NEAR MISS: contains "Millenniummon" as a
//                          substring but is not exactly [Millenniummon]
//   BT6-012 Deltamon      Lv4 Red    7000, [Composite], NO printed or inherited text — the
//                          replacement cost's target. BT19-069 (also [Composite]) is unusable
//                          here: it prints an [On Deletion] hand-trash clause that fires when
//                          the cost deletes it, adding a second card to the controller's trash
//                          as soon as its module is registered.
//   BT1-087 T.K. Takaishi Yellow Tamer, no text — Tamer target / own-side near miss
const DECK = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];

/** `count` distinct, inert, aliased hand cards for the opponent's discard-to-five clause. */
function opponentHand(count: number): { card: string; as: string }[] {
  return Array.from({ length: count }, (_, index) => ({
    card: index % 2 === 0 ? "BT1-009" : "BT1-013",
    as: `oh${index}`,
  }));
}

describe("BT19-075 MoonMillenniummon", () => {
  it("matches the catalog print", () => {
    expect(getCardDefinition("BT19-075")).toMatchObject({
      cardId: "BT19-075",
      nameEn: "MoonMillenniummon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 15,
      dp: 15000,
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Wicked God"],
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 5 }],
    });
    const printed = getCardDefinition("BT19-075")!.effectText!;
    expect(printed).toContain("[Digivolve][Millenniummon]: Cost 2");
    expect(printed).toContain(
      "[On Play] [When Digivolving] Your opponent trashes cards in their hand until they have 5 left. For every 2 cards trashed by this effect, delete 1 of your opponent's Tamers.",
    );
    // The printed line separates "[Composite]" from "trait" with a NON-BREAKING space (U+00A0).
    expect(printed).toContain(
      "[All Turns] When this Digimon would leave the battle area, by deleting 1 of your Digimon with the [Composite]\u00A0trait Digimon, it doesn't leave.",
    );
    expect(printed).toContain(
      "[All Turns] [Once Per Turn] When other Digimon or Tamers are deleted, trash your opponent's top security card.",
    );
    // MoonMillenniummon itself is [Wicked God], not [Composite]: it can never pay its own
    // replacement cost with itself.
    expect(getCardDefinition("BT19-075")!.types).not.toContain("Composite");
  });

  it("compiles the opponent-chosen discard, the self-only replacement and the once-per-turn watcher", () => {
    const compiled = runtimeCompiledCard("BT19-075");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Trash",
            // Q3135: the OPPONENT chooses which cards leave their own hand.
            chooser: "opponent",
            trackCount: "trashedThisEffect",
            target: { filter: { zone: "hand", controller: "opponent" }, untilHandSize: 5 },
          },
          {
            kind: "Delete",
            target: { count: 1, filter: { controller: "opponent", kind: ["Tamer"] } },
            // "For every 2 cards trashed BY THIS EFFECT" — scaled off the tracked count, not
            // off any board or hand total.
            scaling: { per: 2, unit: "namedCount", countSource: "trashedThisEffect" },
          },
        ],
      })),
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            // "When THIS Digimon would leave" — without isSelfRef the generic branch would
            // protect every permanent on both seats (replacement.ts:238-241).
            sourceFilter: { isSelfRef: true },
            actions: [
              {
                kind: "Prevent",
                mode: "leavePlay",
                optional: true,
                cost: {
                  kind: "deleteOwn",
                  target: {
                    count: 1,
                    filter: {
                      controller: "mine",
                      kind: ["Digimon"],
                      // "with the [Composite] trait" is the EXACT trait match.
                      nameOrTrait: [{ tokens: ["Composite"], match: "trait" }],
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      {
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "onDeletionOf",
            // "other Digimon or Tamers" — either seat's, but never this Digimon itself.
            sourceFilter: { excludeSelf: true, kind: ["Digimon", "Tamer"] },
            actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
          },
        ],
      },
    ]);
    // Bracketed `[Millenniummon]` is an EXACT-name route, not the substring `names` gate.
    expect(compiled?.digivolutionRequirement).toEqual([{ namesExact: ["Millenniummon"], cost: 2, isAlternate: true }]);
  });

  // ---------------------------------------------------------------------------
  // [On Play] — Q3135 and the "for every 2 cards" scaling
  // ---------------------------------------------------------------------------

  it("Q3135: the opponent chooses two cards down to five, and two trashed cards delete one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "ownTamer" }],
          hand: [
            { card: "BT19-075", as: "moon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          hand: opponentHand(7),
          battleArea: [
            { card: "BT1-087", as: "tamer1" },
            { card: "BT1-087", as: "tamer2" },
            { card: "BT1-009", as: "opponentDigimon" },
          ],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-009", as: "sec3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 16;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("moon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 5);
    await settleAcrossTimers(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(1);
    // Q3135: the hand selection was asked of the OPPONENT (seat 1), not of the controller.
    const handSelection = s.decisions.find((entry) => entry.req.kind === "selectCards" && entry.seat === 1);
    expect(handSelection).toBeDefined();
    expect(s.state.players[1]!.hand).toHaveLength(5);
    // 2 cards trashed / 2 = exactly one Tamer deleted; the other Tamer and their Digimon stay.
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT1-087")).toHaveLength(
      1,
    );
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.perm("opponentDigimon").topCard!.instanceId,
      ),
    ).toBe(true);
    // The controller's own Tamer is never a candidate.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual([
      "BT1-087",
      "BT19-075",
    ]);
    // The deleted Tamer is an "other Tamer deleted": the watcher trashed exactly one security.
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec2").instanceId,
      s.inst("sec3").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Once Per Turn]: four trashed cards delete two Tamers but still trash only one security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-075", as: "moon" },
            { card: "BT1-013", as: "spare" },
          ],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          hand: opponentHand(9),
          battleArea: [
            { card: "BT1-087", as: "tamer1" },
            { card: "BT1-087", as: "tamer2" },
            { card: "BT1-087", as: "tamer3" },
          ],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-009", as: "sec3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 16;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("moon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await settleAcrossTimers(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.hand).toHaveLength(5);
    // 4 trashed / 2 = 2 Tamers deleted in the same effect.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    // Two Tamer deletions in one turn, but the watcher is [Once Per Turn]: one security card.
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec2").instanceId,
      s.inst("sec3").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("one trashed card deletes no Tamer, and a hand already at five is not touched at all", async () => {
    for (const handSize of [6, 5]) {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "BT19-075", as: "moon" },
              { card: "BT1-013", as: "spare" },
            ],
            deck: DECK,
            security: SECURITY,
          },
          1: {
            hand: opponentHand(handSize),
            battleArea: [{ card: "BT1-087", as: "tamer1" }],
            deck: DECK,
            security: [
              { card: "BT1-009", as: "sec1" },
              { card: "BT1-013", as: "sec2" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 16;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("moon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.battleArea.length === 1);
      await settleAcrossTimers(() => s.state.pendingDecision === undefined);

      expect(s.state.players[1]!.hand).toHaveLength(5);
      expect(s.state.players[1]!.trash).toHaveLength(handSize - 5);
      // floor(1 / 2) = 0 and floor(0 / 2) = 0: the Tamer survives either way.
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
        s.perm("tamer1").topCard!.instanceId,
      ]);
      // No deletion happened, so the watcher never fired.
      expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
        s.inst("sec1").instanceId,
        s.inst("sec2").instanceId,
      ]);
      expect(s.state.pendingDecision).toBeUndefined();

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
  });

  // ---------------------------------------------------------------------------
  // Evolution routes
  // ---------------------------------------------------------------------------

  it("[Digivolve][Millenniummon] costs 2 on a real stack and fires [When Digivolving]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-019", as: "millenniummon", under: ["BT2-067", "BT2-075"] }],
          hand: [{ card: "BT19-075", as: "moon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: {
          hand: opponentHand(7),
          battleArea: [{ card: "BT1-087", as: "tamer1" }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const baseId = s.inst("millenniummon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("millenniummon").permanentId,
        instanceId: s.inst("moon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 5);
    await settleAcrossTimers(() => s.state.pendingDecision === undefined);

    // Cost 2 through the exact-name route, not the 5 of the printed Purple Lv.6 EvoCost.
    expect(s.state.memory).toBe(8);
    expect(s.perm("millenniummon").topCard?.cardId).toBe("BT19-075");
    expect(s.perm("millenniummon").stack.map((card) => card.cardId)).toEqual(["BT2-067", "BT2-075", "BT18-019"]);
    expect(s.perm("millenniummon").stack.at(-1)!.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evoDraw").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec2").instanceId]);
  });

  it("near miss: ZeedMillenniummon only CONTAINS 'Millenniummon', so no route accepts it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-101", as: "zeed" }],
          hand: [{ card: "BT19-075", as: "moon" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("zeed").permanentId,
          instanceId: s.inst("moon").instanceId,
          useAlternateCost,
        }).ok,
      ).toBe(false);
    }

    expect(s.perm("zeed").topCard?.cardId).toBe("BT19-101");
    expect(s.perm("zeed").stack).toHaveLength(0);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("moon").instanceId]);
  });

  it("falls back to the printed Purple Lv.6 EvoCost of 5 for a Lv.6 base that is not [Millenniummon]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-089", as: "boltmon" }],
          hand: [{ card: "BT19-075", as: "moon" }],
          deck: [{ card: "BT1-014", as: "evoDraw" }, ...DECK],
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("boltmon").permanentId,
        instanceId: s.inst("moon").instanceId,
        // No exact-name route matches, so this silently falls back: only the memory delta
        // (5, not 2) discriminates the two routes.
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boltmon").topCard?.cardId === "BT19-075");
    await settleAcrossTimers(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
  });

  it("refuses an illegal source: a Purple Lv.3 matches neither the EvoCost nor the named route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "demidevimon" }],
          hand: [{ card: "BT19-075", as: "moon" }],
          deck: DECK,
          security: SECURITY,
        },
        1: { deck: DECK, security: SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("demidevimon").permanentId,
          instanceId: s.inst("moon").instanceId,
          useAlternateCost,
        }).ok,
      ).toBe(false);
    }
    expect(s.perm("demidevimon").topCard?.cardId).toBe("BT2-067");
    expect(s.state.memory).toBe(10);
  });

  // ---------------------------------------------------------------------------
  // [All Turns] would-leave replacement
  // ---------------------------------------------------------------------------

  it("survives a lost battle by deleting a [Composite] Digimon, never the non-[Composite] peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-075", as: "moon" },
            { card: "BT6-012", as: "composite" },
            { card: "BT1-009", as: "plain" },
          ],
          hand: [{ card: "BT1-013", as: "spare" }],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("moon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // The 20000 DP wall won the battle, but MoonMillenniummon did not leave.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId).sort()).toEqual(
      [s.perm("moon").topCard!.instanceId, s.perm("plain").topCard!.instanceId].sort(),
    );
    // The cost took the [Composite] Digimon; the non-[Composite] peer was never a candidate.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("composite").instanceId]);
    // That Composite deletion is an "other Digimon deleted", so the watcher fired once.
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("sec2").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the replacement lets it leave, and its OWN deletion trashes no security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-075", as: "moon" },
            { card: "BT6-012", as: "composite" },
          ],
          hand: [{ card: "BT1-013", as: "spare" }],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("moon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT19-075"]);
    // The Composite Digimon was not paid, so it is still on the board.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.perm("composite").topCard!.instanceId,
    ]);
    // `excludeSelf`: this Digimon's own deletion is not an "OTHER Digimon" deletion.
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec1").instanceId,
      s.inst("sec2").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [All Turns] [Once Per Turn] watcher — either player's other Digimon
  // ---------------------------------------------------------------------------

  it.each([
    ["an opponent's Digimon dying in battle", 1_000, 0],
    ["the controller's OWN Digimon dying in battle", 20_000, 1],
  ])("trashes the opponent's top security when %s", async (_label, wallDp, opponentSurvivors) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-075", as: "moon" },
            { card: "BT1-013", as: "attacker", dp: 5_000 },
          ],
          hand: [{ card: "BT1-013", as: "spare" }],
          deck: DECK,
          security: SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "wall", dp: wallDp, suspended: true }],
          deck: DECK,
          security: [
            { card: "BT1-009", as: "sec1" },
            { card: "BT1-013", as: "sec2" },
            { card: "BT1-009", as: "sec3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea).toHaveLength(opponentSurvivors);
    // Either seat's other Digimon counts: one security card left the opponent's stack, in order.
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("sec2").instanceId,
      s.inst("sec3").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("sec1").instanceId);
    // MoonMillenniummon itself never left the board.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toContain("BT19-075");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
