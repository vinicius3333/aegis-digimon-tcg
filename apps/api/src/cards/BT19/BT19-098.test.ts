import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-098 King Device — Purple Option, use cost 4, [Device] trait.
//   (colour waiver) While you don't have [King Device], you may ignore this card's colour
//     requirements.
//   (on-trash)      When an effect trashes this card in your battle area, place 1 Option card
//     with the [Device] trait with a use cost of 3 or less from your trash into the battle area.
//   [Main]          Place 1 Option card with the [Device] trait with a use cost of 3 or less
//     from your trash into the battle area. Then, place this card in the battle area.
//   [Security]      You may place 1 Option card with the [Device] trait from your hand in the
//     battle area. Then, add this card to the hand.
//
// KB: `node tools/kb/query.mjs card BT19-098` reports no entries, and KB-INDEX.md lists 0 Q&A
// ids for this card, so there is no ruling to cover.
//
// Fixture vocabulary:
//   BT3-076 Candlemon   — inert mono-PURPLE Lv.3, 3000 DP. Seat 0's colour source.
//   BT1-038 Monzaemon   — inert mono-BLUE Lv.5. The off-colour board for the refusal case.
//   BT19-093 Queen Device — a [Device] Option that is NOT [King Device]: the name near miss for
//                         the waiver's "while you don't have [King Device]" gate.
//   BT19-095 Knight Device (c3) / P-155 Pawn Device (c2) — the [Device] Options at or under the
//                         printed use-cost 3 ceiling.
//   BT19-098 King Device itself (c4) — the COST near miss: a [Device] Option above the ceiling.
//   BT19-097 Bonds of True Love (Purple Option, c3, no [Device] trait) — the TRAIT near miss.
//   BT19-086 Ryo Akiyama — Black Tamer whose [Main] pays `deleteOwn` on 4 [Device] Options in
//                         the battle area. The only printed way to make an EFFECT trash King
//                         Device out of the battle area.
//   EX3-050 Cyberdramon — the [Cyberdramon] Ryo may play; keeps his effect from stalling.
//   BT1-009..BT1-013    — inert main-deck Digimon used as deck and security padding. No
//                         Digi-Egg is seeded in any deck or security stack.

const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

const boardCardIds = (s: EngineSetup, seat: 0 | 1): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort();

const trashCardIds = (s: EngineSetup, seat: 0 | 1): string[] =>
  s.state.players[seat]!.trash.map((card) => card.cardId).sort();

describe("BT19-098 King Device — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-098")).toMatchObject({
      cardId: "BT19-098",
      nameEn: "King Device",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      types: ["Device"],
      maxCountInDeck: 4,
    });
    // The catalog stores a NON-BREAKING space (U+00A0) after each "[Device] trait"; normalise it
    // so the assertion reads as the printed sentence. Reported as a catalog quirk, not edited.
    const printed = getCardDefinition("BT19-098")!;
    const effectText = printed.effectText!.replaceAll("\u00a0", " ");
    const securityText = printed.securityEffectText!.replaceAll("\u00a0", " ");
    expect(effectText).toContain("While you don't have [King Device], you may ignore this card's color");
    expect(effectText).toContain(
      "When an effect trashes this card in your battle area, place 1 Option card with the [Device] trait " +
        "with a use cost of 3 or less from your trash into the battle area.",
    );
    expect(effectText).toContain(
      "[Main] Place 1 Option card with the [Device] trait with a use cost of 3 or less from your trash " +
        "into the battle area. Then, place this card in the battle area.",
    );
    expect(securityText).toBe(
      "[Security] You may place 1 Option card with the [Device] trait from your hand in the battle area. " +
        "Then, add this card to the hand.",
    );
  });

  it("compiles the four printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-098");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "WaiveColorRequirement",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            condition: {
              kind: "youHaveNone",
              filter: {
                controllerDefault: "mine",
                // Bracketed [King Device] is EXACT: `match: "name"` is the substring form.
                nameOrTrait: [{ tokens: ["King Device"], match: "nameExact" }],
              },
            },
          },
        ],
      },
      {
        // "When an effect trashes this card in your battle area" is live on both turns, so the
        // watcher block is AllTurns and the event is the effect-trash bus, not generic deletion.
        trigger: "AllTurns",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenTrashedByEffect",
            sourceFilter: { isSelfRef: true, zone: "battleArea" },
            actions: [
              {
                kind: "PlaceInBattleAreaSelf",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "trash",
                    kind: ["Option"],
                    nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
                    // Loose-zone matchers read `playCostLte`; the `{ op, value }` object form is
                    // only honoured for permanent targets and would be silently dropped here.
                    playCostLte: 3,
                  },
                  count: 1,
                  from: ["trash"],
                },
              },
            ],
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "PlaceInBattleAreaSelf",
            target: {
              filter: {
                controller: "mine",
                zone: "trash",
                kind: ["Option"],
                nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
                playCostLte: 3,
              },
              count: 1,
              from: ["trash"],
            },
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "PlaceInBattleAreaSelf",
            // "You may place" — and the security clause prints NO use-cost ceiling.
            optional: true,
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                kind: ["Option"],
                nameOrTrait: [{ tokens: ["Device"], match: "trait" }],
              },
              count: 1,
              from: ["hand"],
            },
          },
          { kind: "AddToHandSelf" },
        ],
      },
    ]);
    // The security clause must NOT inherit the [Main]/on-trash cost ceiling.
    const security = runtimeCompiledCard("BT19-098")!.effects.find((effect) => effect.trigger === "Security")!;
    expect(
      (security.actions[0] as { target?: { filter?: { playCostLte?: number } } }).target?.filter?.playCostLte,
    ).toBe(undefined);
  });
});

describe("BT19-098 King Device — use cost and the colour requirement", () => {
  function colourFixture(ownBoard: string[]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-098", as: "king" }, "BT1-009"],
          battleArea: ownBoard.map((card, index) => ({ card, as: `own${index}` })),
          trash: [{ card: "BT19-095", as: "knight" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-051", as: "bystander" }], deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    return s;
  }

  it("refuses the play on an all-blue board while a [King Device] is already in the battle area", async () => {
    const s = colourFixture(["BT1-038", "BT19-098"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-098");
    // Nothing resolved: the Knight is still in the trash.
    expect(trashCardIds(s, 0)).toEqual(["BT19-095"]);
  });

  it("waives the colour requirement on the same all-blue board once no [King Device] is out", async () => {
    const s = colourFixture(["BT1-038"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => boardCardIds(s, 0).includes("BT19-098"));
    // The printed 4 is still charged: only the COLOUR requirement is waived.
    expect(s.state.memory).toBe(6);
  });

  it("accepts the play off a single purple permanent even while a [King Device] blocks the waiver", async () => {
    const s = colourFixture(["BT3-076", "BT1-038", "BT19-098"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => boardCardIds(s, 0).filter((cardId) => cardId === "BT19-098").length === 2);
    expect(s.state.memory).toBe(6);
  });

  it("near miss: a [Queen Device] on the board is not a [King Device], so the waiver still applies", async () => {
    // BT19-093 shares the [Device] trait and the same printed waiver sentence; only the exact
    // name in the brackets differs. A trait-wide or substring gate would refuse this play.
    const s = colourFixture(["BT1-038", "BT19-093"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("king").instanceId })).toEqual({ ok: true });
    await settle(() => boardCardIds(s, 0).includes("BT19-098"));
    expect(s.state.memory).toBe(6);
  });
});

describe("BT19-098 King Device — [Main]", () => {
  function mainFixture(trash: (string | { card: string; as: string })[], prefer: string[]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-098", as: "king" }, "BT1-009"],
          battleArea: [{ card: "BT3-076", as: "purple" }],
          trash,
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-051", as: "bystander" }], deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 10;
    return s;
  }

  it("places 1 qualifying [Device] Option out of the trash, then places itself, for the printed 4 memory", async () => {
    const prefer: string[] = [];
    const s = mainFixture(
      [
        { card: "BT19-095", as: "knight" },
        { card: "BT19-098", as: "costMiss" },
        { card: "BT19-097", as: "traitMiss" },
      ],
      prefer,
    );
    prefer.push(s.inst("knight").instanceId);
    await s.ready();
    const kingId = s.inst("king").instanceId;
    const knightId = s.inst("knight").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: kingId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kingId));

    // "Place 1 Option card with the [Device] trait ... from your trash into the battle area."
    const knight = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === knightId);
    expect(knight).toBeDefined();
    expect(knight!.placedByEffect).toBe(true);
    // "Then, place this card in the battle area." — the Option is a permanent, not trash.
    const king = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === kingId);
    expect(king).toBeDefined();
    expect(king!.placedByEffect).toBe(true);
    expect(boardCardIds(s, 0)).toEqual(["BT19-095", "BT19-098", "BT3-076"]);

    // The near misses stay put: BT19-098 is a [Device] Option but costs 4, and BT19-097 is a
    // cost-3 Option with no [Device] trait.
    expect(trashCardIds(s, 0)).toEqual(["BT19-097", "BT19-098"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("costMiss").instanceId, s.inst("traitMiss").instanceId]),
    );
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("places only itself when the trash holds nothing but the cost and trait near misses", async () => {
    const s = mainFixture(
      [
        { card: "BT19-098", as: "costMiss" },
        { card: "BT19-097", as: "traitMiss" },
      ],
      [],
    );
    await s.ready();
    const kingId = s.inst("king").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: kingId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === kingId));

    expect(boardCardIds(s, 0)).toEqual(["BT19-098", "BT3-076"]);
    expect(trashCardIds(s, 0)).toEqual(["BT19-097", "BT19-098"]);
    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });
});

describe("BT19-098 King Device — trashed in the battle area by an effect", () => {
  /**
   * Seat 0 holds Ryo Akiyama and exactly four [Device] Options, one of them King Device.
   * Ryo's [Main] pays `deleteOwn` on all four — a real battle-area trash, which is the only
   * printed way to fire this clause (a plain `trash` cost does not use the battle-area bus).
   */
  function trashFixture(prefer: string[]): EngineSetup {
    return setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-086", as: "ryo" },
            { card: "BT3-076", as: "purple" },
            { card: "P-155", as: "pawn0" },
            { card: "P-155", as: "pawn1" },
            { card: "P-155", as: "pawn2" },
            { card: "BT19-098", as: "king" },
          ],
          hand: [{ card: "EX3-050", as: "cyberdramon" }],
          trash: [
            { card: "BT19-095", as: "knight" },
            { card: "BT19-097", as: "traitMiss" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-051", as: "bystander" }], deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
  }

  const activateRyo = (s: EngineSetup): unknown => {
    const entries = JSON.parse(s.perm("ryo").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(entries.length).toBeGreaterThan(0);
    return s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("ryo").topCard!.instanceId,
      effectKey: entries[0]!.effectKey,
    });
  };

  it("fires off a real deleteOwn cost and pulls a cost-3-or-less [Device] Option back out of the trash", async () => {
    const prefer: string[] = [];
    const s = trashFixture(prefer);
    prefer.push(s.inst("knight").instanceId);
    s.state.memory = 3;
    await s.ready();
    const kingId = s.inst("king").instanceId;
    const knightId = s.inst("knight").instanceId;

    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === kingId));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === knightId));

    // King Device really left the battle area for the trash...
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(kingId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).not.toContain(kingId);
    // ...and its clause put the Knight back on the board.
    const knight = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === knightId);
    expect(knight).toBeDefined();
    expect(knight!.placedByEffect).toBe(true);
    // The trait near miss is untouched, and King Device itself (cost 4) is not re-placed.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("traitMiss").instanceId);
    expect(boardCardIds(s, 0).filter((cardId) => cardId === "BT19-098")).toEqual([]);
    assertNoLoudGap(s);
  });

  it("places nothing when the trash holds no [[Device]] Option at 3 or less, and still leaves the King trashed", async () => {
    // Control run: only the trait near miss is in the trash before Ryo pays. The three Pawn
    // Devices land in the trash as part of the same payment, so the assertion pins the placement
    // to the King's own clause by instance id rather than by card id.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-086", as: "ryo" },
            { card: "BT3-076", as: "purple" },
            { card: "P-159", as: "rook0" },
            { card: "P-161", as: "bishop0" },
            { card: "BT19-093", as: "queen" },
            { card: "BT19-098", as: "king" },
          ],
          hand: [{ card: "EX3-050", as: "cyberdramon" }],
          trash: [{ card: "BT19-097", as: "traitMiss" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-051", as: "bystander" }], deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 3;
    await s.ready();
    const kingId = s.inst("king").instanceId;

    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === kingId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(kingId);
    // The trait near miss was never eligible, so it never left the trash.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("traitMiss").instanceId);
  });
});

describe("BT19-098 King Device — [Security]", () => {
  function securityFixture(defenderHand: (string | { card: string; as: string })[], prefer: string[]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "attacker" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: defenderHand,
          deck: [...FILLER],
          security: [{ card: "BT19-098", as: "flip" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 3;
    return s;
  }

  it("places a [Device] Option out of the defender's hand, then adds itself to that hand", async () => {
    const prefer: string[] = [];
    const s = securityFixture(
      [
        { card: "BT19-095", as: "knight" },
        { card: "BT19-097", as: "traitMiss" },
      ],
      prefer,
    );
    prefer.push(s.inst("knight").instanceId);
    await s.ready();
    const flipId = s.inst("flip").instanceId;
    const knightId = s.inst("knight").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === flipId));

    // "You may place 1 Option card with the [Device] trait from your hand in the battle area."
    const knight = s.state.players[1]!.battleArea.find((permanent) => permanent.topCard?.instanceId === knightId);
    expect(knight).toBeDefined();
    expect(knight!.placedByEffect).toBe(true);
    // "Then, add this card to the hand" — the Option is in the defender's hand, not the trash.
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(flipId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(flipId);
    // The non-[Device] Option is not a candidate and stays in hand.
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("traitMiss").instanceId);
    expect(s.state.players[1]!.security.length).toBe(2);
    assertNoLoudGap(s);
  });

  it("still adds itself to hand when the defender's hand holds no [Device] Option", async () => {
    const s = securityFixture([{ card: "BT19-097", as: "traitMiss" }], []);
    await s.ready();
    const flipId = s.inst("flip").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === flipId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.cardId).sort()).toEqual(["BT19-097", "BT19-098"]);
    assertNoLoudGap(s);
  });

  it("declined: the optional placement is skipped but the card is still added to hand", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-051", as: "attacker" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: [{ card: "BT19-095", as: "knight" }],
          deck: [...FILLER],
          security: [{ card: "BT19-098", as: "flip" }, "BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    s.state.memory = 3;
    await s.ready();
    const flipId = s.inst("flip").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === flipId));

    // "You may place" declined: the Knight stays in hand, but "Then, add this card to the hand"
    // is a separate mandatory sentence and still runs.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.cardId).sort()).toEqual(["BT19-095", "BT19-098"]);
    assertNoLoudGap(s);
  });
});

describe("BT19-098 King Device — turn-loop reach of the on-trash watcher", () => {
  it("keeps the effect-trash watcher live into the opponent's turn", async () => {
    // The clause is not [Your Turn]-scoped: it must still fire while the opponent holds
    // priority. Ryo's [Main] is a [Your Turn] activation, so the opponent-turn probe is the
    // watcher's continued subscription, read inside the opponent's own open Main phase.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-086", as: "ryo" },
            { card: "BT3-076", as: "purple" },
            { card: "P-155", as: "pawn0" },
            { card: "P-155", as: "pawn1" },
            { card: "P-155", as: "pawn2" },
            { card: "BT19-098", as: "king" },
          ],
          hand: [{ card: "EX3-050", as: "cyberdramon" }, "BT1-009"],
          trash: [{ card: "BT19-095", as: "knight" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [{ card: "BT1-051", as: "bystander" }],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.inst("knight").instanceId);
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    const knightId = s.inst("knight").instanceId;
    const entries = JSON.parse(s.perm("ryo").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("ryo").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === knightId));
    advance(s.engine).endMainPhaseIfOpen(0);

    // The placed Knight is a real permanent that survives into the opponent's turn.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toContain(knightId);

    advance(s.engine).endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
