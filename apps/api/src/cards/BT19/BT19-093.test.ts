import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

// BT19-093 Queen Device — Yellow Option, play cost 3, [Device] trait.
//   (colour waiver) While you don't have [Queen Device], you may ignore this card's colour
//     requirements.
//   (on-trash)      When an effect trashes this card in your battle area, until the end of your
//     opponent's turn, 1 of your opponent's Digimon gets -3000 DP and that Digimon's
//     [When Digivolving] effects don't activate.  (KB Q3166 pins the duration.)
//   [Main]          Same debuff + lock. Then, place this card in the battle area.
//   [Security]      2 of your opponent's Digimon gain ＜Security A. -2＞ for the turn. Then, add
//     this card to the hand.
//
// Fixture vocabulary:
//   BT1-051 Reppamon      — inert mono-YELLOW Lv.4, 4000 DP. Seat 0's colour source; also the
//                           opponent body the debuff/lock lands on (4000 - 3000 = 1000 > 0, so
//                           the DP change is visible and nothing is deleted by it).
//   BT1-038 Monzaemon     — inert mono-BLUE Lv.5. The off-colour board for the refusal case.
//   BT19-098 King Device  — a [Device] Option that is NOT [Queen Device]: the name near miss for
//                           the waiver's "while you don't have [Queen Device]" gate.
//   BT19-086 Ryo Akiyama  — Black Tamer whose [Main] pays `deleteOwn` on 4 [Device] Options in
//                           the battle area. The only real way to make an EFFECT trash Queen
//                           Device out of the battle area (P-155's own ＜Delay＞ uses a plain
//                           `trash` cost, which does not fire the battle-area trash bus).
//   P-155 Pawn Device     — [Device] Option printing NO on-trash clause: silent payment fodder.
//   EX3-050 Cyberdramon   — the [Cyberdramon] Ryo may play; keeps his effect from stalling.
//   BT19-039 SkullBaluchimon — [When Digivolving] "By trashing your top security card, ...".
//                           The Q5546/Q5549 probe: neither the payload nor the "by" cost runs.
//   BT14-080 Ghoulmon     — one shared "[When Digivolving][When Attacking][Once Per Turn]"
//                           clause. The Q5547/Q5550 probe: the digivolve half is blocked and
//                           does NOT consume the once-per-turn, so the attack half still runs.
//   BT3-037 / BT2-075     — the unlocked opponent peers (positive controls).
//   BT1-009/010/011/012/013 — inert main-deck Digimon used as deck and security padding. No
//                           Digi-Egg is seeded in any deck or security stack.

const FILLER = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"];
const SECURITY = ["BT1-009", "BT1-010", "BT1-011"];

const boardCardIds = (s: EngineSetup, seat: 0 | 1): (string | undefined)[] =>
  s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort();

describe("BT19-093 Queen Device — catalog and IR", () => {
  it("matches the printed catalog record", () => {
    expect(getCardDefinition("BT19-093")).toMatchObject({
      cardId: "BT19-093",
      nameEn: "Queen Device",
      colors: ["Yellow"],
      kinds: ["Option"],
      playCost: 3,
      dp: 0,
      evoCosts: [],
      types: ["Device"],
      maxCountInDeck: 4,
    });
    const printed = getCardDefinition("BT19-093")!;
    expect(printed.effectText).toContain("While you don't have [Queen Device], you may ignore this card's color");
    expect(printed.effectText).toContain(
      "When an effect trashes this card in your battle area, until the end of your opponent's turn, " +
        "1 of your opponent's Digimon gets -3000 DP and that Digimon's [When Digivolving] effects don't activate.",
    );
    expect(printed.effectText).toContain("Then, place this card in the battle area.");
    expect(printed.securityEffectText).toBe(
      "[Security] 2 of your opponent's Digimon gain ＜Security A. -2＞for the turn. Then, add this card to the hand.",
    );
  });

  it("compiles the four printed clauses to the intended IR shape", () => {
    const card = runtimeCompiledCard("BT19-093");

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
                // Bracketed [Queen Device] is EXACT: `match: "name"` is the substring form.
                nameOrTrait: [{ tokens: ["Queen Device"], match: "nameExact" }],
              },
            },
          },
        ],
      },
      {
        // "[All Turns]" in substance: the watcher must be live on the opponent's turn too,
        // which is exactly the situation KB Q3166 asks about.
        trigger: "AllTurns",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenTrashedByEffect",
            sourceFilter: { isSelfRef: true, zone: "battleArea" },
            actions: [
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                amount: -3000,
                duration: "untilOpponentTurnEnd",
              },
              {
                kind: "Restrict",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
                restriction: "cannotActivateWhenDigivolving",
                duration: "untilOpponentTurnEnd",
              },
            ],
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          { kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd" },
          {
            kind: "Restrict",
            restriction: "cannotActivateWhenDigivolving",
            duration: "untilOpponentTurnEnd",
            target: { sameTarget: true },
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 2 },
            keyword: { keyword: "SecurityAttack", amount: -2 },
            duration: "forTheTurn",
          },
          { kind: "AddToHandSelf" },
        ],
      },
    ]);
  });
});

describe("BT19-093 Queen Device — use cost and the colour requirement", () => {
  function colourFixture(ownBoard: string[]): EngineSetup {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-093", as: "queen" }, "BT1-009"],
          battleArea: ownBoard.map((card, index) => ({ card, as: `own${index}` })),
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: { battleArea: [{ card: "BT1-051", as: "victim" }], deck: [...FILLER], security: [...SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    return s;
  }

  it("refuses the play on an all-blue board while a [Queen Device] is already in the battle area", async () => {
    const s = colourFixture(["BT1-038", "BT19-093"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT19-093");
    expect(s.perm("victim").currentDP).toBe(4000);
  });

  it("waives the colour requirement on the same all-blue board once no [Queen Device] is out", async () => {
    const s = colourFixture(["BT1-038"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("victim").currentDP === 1000);
    // The printed 3 is still charged: only the COLOUR requirement is waived.
    expect(s.state.memory).toBe(7);
  });

  it("accepts the play off a single yellow permanent even while a [Queen Device] blocks the waiver", async () => {
    const s = colourFixture(["BT1-051", "BT1-038", "BT19-093"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("victim").currentDP === 1000);
    expect(s.state.memory).toBe(7);
  });

  it("near miss: a [King Device] on the board is not a [Queen Device], so the waiver still applies", async () => {
    // BT19-098 shares the [Device] trait and the same printed waiver sentence; only the exact
    // name in the brackets differs. A trait- or Device-wide gate would refuse this play.
    const s = colourFixture(["BT1-038", "BT19-098"]);
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("victim").currentDP === 1000);
    expect(s.state.memory).toBe(7);
  });
});

describe("BT19-093 Queen Device — [Main]", () => {
  function mainFixture(preferAlias?: string) {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-093", as: "queen" }, "BT1-009"],
          battleArea: [{ card: "BT1-051", as: "mine" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT1-051", as: "target" },
            { card: "BT1-051", as: "bystander" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    if (preferAlias !== undefined) {
      prefer.push(s.perm(preferAlias).permanentId, s.perm(preferAlias).topCard!.instanceId);
    }
    s.state.memory = 10;
    return s;
  }

  it("debuffs and locks ONE opponent Digimon, leaves the peers alone, then places itself on the board", async () => {
    const s = mainFixture("target");
    await s.ready();
    const queenId = s.inst("queen").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: queenId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 1000);

    // Both halves of the sentence land on the SAME Digimon.
    expect(s.perm("target").currentDP).toBe(1000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
    // The opponent's other Digimon and my own board are untouched.
    expect(s.perm("bystander").currentDP).toBe(4000);
    expect(observe(s.engine).isRestricted(s.perm("bystander"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(s.perm("mine").currentDP).toBe(4000);
    expect(observe(s.engine).isRestricted(s.perm("mine"), "cannotActivateWhenDigivolving")).toBe(false);

    // "Then, place this card in the battle area": the Option is a permanent, not trash.
    const placed = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === queenId);
    expect(placed).toBeDefined();
    expect(placed!.placedByEffect).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(queenId);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("blocks the locked Digimon's [When Digivolving] payload AND its 'by' cost (Q5546, Q5549)", async () => {
    // BT19-039 SkullBaluchimon: "[When Digivolving] By trashing your top security card, ...".
    // Q5549 — the "by" condition is not processed either, so their security stack is untouched.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-093", as: "queen" }, "BT1-013"],
          battleArea: [{ card: "BT1-051", as: "mine" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT1-051", as: "locked" },
            { card: "BT3-037", as: "free" },
          ],
          hand: [{ card: "BT19-039", as: "skull" }, { card: "BT19-039", as: "skullTwo" }, { card: "BT1-013" }],
          deck: [...FILLER],
          security: [
            { card: "BT1-009", as: "oppSecTop" },
            { card: "BT1-010", as: "oppSecSecond" },
            { card: "BT1-011", as: "oppSecThird" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("locked").permanentId, s.perm("locked").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("locked"), "cannotActivateWhenDigivolving"));
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    // Q3166: the lock is still in force on the OPPONENT'S turn.
    expect(observe(s.engine).isRestricted(s.perm("locked"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.perm("locked").currentDP).toBe(1000);

    const skullId = s.inst("skull").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: skullId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === skullId));

    // Nothing was trashed from their security and nothing of mine was deleted.
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("oppSecTop").instanceId,
      s.inst("oppSecSecond").instanceId,
      s.inst("oppSecThird").instanceId,
    ]);
    expect(boardCardIds(s, 0)).toEqual(["BT1-051", "BT19-093"]);

    // Positive control on their NEXT turn with the unlocked peer: the same card pays and deletes.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("free").permanentId,
        instanceId: s.inst("skullTwo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("oppSecTop").instanceId);

    advance(s.engine).endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves the [When Attacking] half of a shared clause usable, unspent by the blocked digivolve (Q5547, Q5550)", async () => {
    // BT14-080 Ghoulmon prints ONE "[When Digivolving][When Attacking][Once Per Turn]" clause:
    // "For every 10 cards in your trash, trash the top 3 cards of your opponent's deck".
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-093", as: "queen" }, "BT1-013"],
          battleArea: [{ card: "BT1-051", as: "mine" }],
          deck: [...FILLER, ...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT2-075", as: "locked" },
            { card: "BT1-013", as: "decoy" },
          ],
          hand: [{ card: "BT14-080", as: "ghoulmon" }, { card: "BT1-013" }],
          trash: Array.from({ length: 10 }, () => "BT1-009"),
          deck: [...FILLER],
          security: [...SECURITY],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    prefer.push(s.perm("locked").permanentId, s.perm("locked").topCard!.instanceId);
    s.state.memory = 6;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("locked"), "cannotActivateWhenDigivolving"));
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    const ghoulmonId = s.inst("ghoulmon").instanceId;
    const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: ghoulmonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === ghoulmonId));
    // The [When Digivolving] half was blocked: my deck is untouched.
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("locked").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === deckBefore.length - 3);

    // Q5550: the blocked digivolve did NOT consume the [Once Per Turn], so the attack half ran.
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBefore.slice(3));

    advance(s.engine).endMainPhaseIfOpen(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-093 Queen Device — trashed in the battle area by an effect (Q3166)", () => {
  /**
   * Seat 0 holds Ryo Akiyama and exactly four [Device] Options, one of them Queen Device.
   * Ryo's [Main] pays `deleteOwn` on all four — a real battle-area trash, which is the only
   * printed way to fire this clause.
   */
  function trashFixture(prefer: string[]) {
    return setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-086", as: "ryo" },
            { card: "BT1-051", as: "mine" },
            { card: "P-155", as: "device0" },
            { card: "P-155", as: "device1" },
            { card: "P-155", as: "device2" },
            { card: "BT19-093", as: "queen" },
          ],
          hand: [{ card: "EX3-050", as: "cyberdramon" }],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          battleArea: [
            { card: "BT1-051", as: "target" },
            { card: "BT1-051", as: "bystander" },
          ],
          deck: [...FILLER],
          security: [...SECURITY],
        },
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

  it("fires off a real deleteOwn cost and applies the debuff and lock to one opponent Digimon", async () => {
    const prefer: string[] = [];
    const s = trashFixture(prefer);
    prefer.push(s.perm("target").permanentId, s.perm("target").topCard!.instanceId);
    s.state.memory = 3;
    await s.ready();
    const queenId = s.inst("queen").instanceId;

    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === queenId));
    await settle(() => s.perm("target").currentDP === 1000);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(queenId);
    expect(s.perm("target").currentDP).toBe(1000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.perm("bystander").currentDP).toBe(4000);
    expect(observe(s.engine).isRestricted(s.perm("bystander"), "cannotActivateWhenDigivolving")).toBe(false);
    expect(s.perm("mine").currentDP).toBe(4000);
    assertNoLoudGap(s);
  });

  it("keeps the debuff and lock alive through the whole of the opponent's turn, then drops both (Q3166)", async () => {
    const prefer: string[] = [];
    const s = trashFixture(prefer);
    prefer.push(s.perm("target").permanentId, s.perm("target").topCard!.instanceId);
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();

    await advance(s.engine).waitForMainPhase(0);
    expect(activateRyo(s)).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 1000);
    advance(s.engine).endMainPhaseIfOpen(0);

    // Read INSIDE the opponent's open Main phase: "until the end of your opponent's turn".
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(1000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);

    // My next turn: the window has closed.
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cannotActivateWhenDigivolving")).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT19-093 Queen Device — [Security]", () => {
  it("gives ＜Security A. -2＞ to two attacker-side Digimon and returns itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-051", as: "attacker" },
            { card: "BT1-051", as: "second" },
          ],
          hand: ["BT1-009"],
          deck: [...FILLER],
          security: [...SECURITY],
        },
        1: {
          hand: [],
          deck: [...FILLER],
          security: [{ card: "BT19-093", as: "flip" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("flip").instanceId));

    // "Then, add this card to the hand" — the Option is in the defender's hand, not the trash.
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT19-093"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).not.toContain("BT19-093");
    // "2 of your opponent's Digimon": both of seat 0's Digimon, none of seat 1's own board.
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(-2);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(-2);

    // Behavioural consequence: 1 base check - 2 => the second attacker checks no security.
    const securityBefore = s.state.players[1]!.security.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").isSuspended);
    expect(s.state.players[1]!.security.length).toBe(securityBefore);
    assertNoLoudGap(s);
  });
});
