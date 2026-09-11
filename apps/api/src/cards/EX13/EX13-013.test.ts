import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX13-013.js";

/**
 * EX13-013 WarGrowlmon. `node tools/kb/query.mjs card EX13-013` reports no knowledge-base
 * entries — EX13 is pre-release — so every assertion is anchored on the printed text and on
 * `data/kb/rules/comprehensive.md` (16-44 ＜Engage＞, §4-22-1 "in its text").
 */
const CARD_ID = "EX13-013";

// Inert fixtures. No printed text at all unless noted, so nothing below competes with the
// card under test for a trigger window or a decision.
const LV4_RED = "BT1-014"; // Kokatorimon, Red Lv.4, 4000 DP — the legal digivolution source.
const LV3_RED = "BT1-009"; // Monodramon, Red Lv.3, 3000 DP — illegal source, and the security body.
const LV5_BLUE = "BT1-038"; // Monzaemon, Blue Lv.5, 6000 DP — illegal source (wrong colour).
const BODY = "BT1-013"; // Muchomon, Red Lv.3, 5000 DP — the resizable opposing body.
const SECOND_SECURITY = "BT1-010"; // Agumon — [On Play] only, never reached from security here.
const GALLANTMON = "BT2-020"; // Gallantmon Lv.6 — an inherited host WITH [Gallantmon] in its name.
const FLARE = "BT2-091"; // Volcanic Flare — [Main] Delete 1 of your opponent's Digimon with 4000 DP or less.

// The [Guilmon]-in-its-text discrimination trio.
const GUILMON_TAMER = "BT17-080"; // Takato Matsuki, Tamer, cost 3 — "[Guilmon]/[Growlmon]/[Gallantmon]" in its text.
const PLAIN_TAMER = "BT12-088"; // Takuya Kanbara, Tamer, cost 4 — no [Guilmon] anywhere in its printing.
const GUILMON_DIGIMON = "EX13-007"; // Guilmon — [Guilmon] in its NAME but a Digimon, not a Tamer card.

describe("EX13-013 WarGrowlmon", () => {
  it("matches the catalog printing", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "WarGrowlmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 8000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg"],
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      effectText:
        "＜Engage＞ \n[When Digivolving] [When Attacking] Delete 1 of your opponent's Digimon with 5000 DP or less. If this effect didn't delete, this Digimon gains ＜Piercing＞ and +3000 DP for the turn.\n[End of Attack] [On Deletion] You may play 1 Tamer card with [Guilmon] in its text from your hand or trash without paying the cost.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When any of your opponent's Digimon are deleted, if this Digimon has [Gallantmon] in its name, trash their top security card.",
    });
  });

  it("compiles every printed clause and nothing else", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.map((effect) => effect.trigger)).toEqual([
      "Static",
      "EndOfYourTurn",
      "WhenDigivolving",
      "WhenAttacking",
      "EndOfAttack",
      "OnDeletion",
      "AllTurns",
    ]);

    // ＜Engage＞: comprehensive rules 16-44 — an optional trigger-type effect at End of Your Turn.
    expect(compiled.effects[0]).toMatchObject({ keywords: [{ keyword: "Engage", raw: "＜Engage＞" }], actions: [] });
    expect(compiled.effects[1]).toMatchObject({
      actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true }],
    });

    // The delete/fallback body is printed once under two timings, with no [Once Per Turn], so
    // each timing is an independent effect with no pooled use key.
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.isInherited).toBeUndefined();
      expect(effect.frequency).toBeUndefined();
      expect(effect.sharedUseKey).toBeUndefined();
      expect(effect.actions).toMatchObject([
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } }, count: 1 },
        },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Piercing" },
          duration: "forTheTurn",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
        { kind: "ModifyDP", amount: 3000, duration: "forTheTurn", condition: { kind: "ifThisEffectDidNotDelete" } },
      ]);
      // Mandatory delete: no `optional`, which is what makes "didn't delete" mean "could not".
      expect(effect.actions[0]).not.toHaveProperty("optional");
    }

    // "1 Tamer card with [Guilmon] in its text from your hand or trash": the kind gate is the
    // load-bearing half — EX13-007 Guilmon answers the text reference but is a Digimon card.
    for (const trigger of ["EndOfAttack", "OnDeletion"] as const) {
      expect(compiled.effects.find((candidate) => candidate.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Guilmon"], match: "text" }] },
              count: 1,
            },
            from: ["hand", "trash"],
            payCost: false,
            optional: true,
          },
        ],
      });
    }

    expect(compiled.effects[6]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              condition: { kind: "selfHasNameContaining", names: ["Gallantmon"] },
            },
          ],
        },
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // Digivolution: Red Lv.4 for 3 memory, plus the [When Digivolving] clause.
  // ---------------------------------------------------------------------------

  it("digivolves from a Red Lv.4 source for 3 memory and deletes a 5000 DP Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV4_RED, as: "source" }],
          hand: [{ card: CARD_ID, as: "war" }],
          deck: [{ card: LV3_RED, as: "drawn" }],
          security: [LV3_RED],
        },
        1: {
          battleArea: [{ card: BODY, as: "victim", dp: 5000 }],
          security: [LV3_RED, SECOND_SECURITY],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const victimId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("war").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const war = s.perm("war");
    expect(war.topCard?.cardId).toBe(CARD_ID);
    // `Permanent.stack` holds only the cards beneath the top card: the Lv.4 source survives.
    expect(war.stack.map((card) => card.cardId)).toEqual([LV4_RED]);
    expect(war.currentDP).toBe(8000);
    expect(observe(s.engine).hasPierce(war)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("victim").instanceId]);
    // 10 - 3 (printed digivolution cost); the bonus draw is a card, not memory.
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual([LV3_RED, SECOND_SECURITY]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("refuses a Red Lv.3 source and a Blue Lv.5 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: LV3_RED, as: "lv3" },
          { card: LV5_BLUE, as: "blue" },
        ],
        hand: [
          { card: CARD_ID, as: "warA" },
          { card: CARD_ID, as: "warB" },
        ],
        deck: [LV3_RED],
        security: [LV3_RED],
      },
      1: { security: [LV3_RED] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lv3").permanentId,
        instanceId: s.inst("warA").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blue").permanentId,
        instanceId: s.inst("warB").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("takes the Piercing / +3000 DP branch when the opponent's Digimon is over 5000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV4_RED, as: "source" }],
          hand: [{ card: CARD_ID, as: "war" }],
          deck: [{ card: LV3_RED, as: "drawn" }],
          security: [LV3_RED],
        },
        1: {
          battleArea: [{ card: BODY, as: "survivor", dp: 6000 }],
          security: [LV3_RED, SECOND_SECURITY],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("war").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.cardId === CARD_ID && permanent.currentDP === 11_000,
      ),
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("survivor").currentDP).toBe(6000);
    expect(s.perm("war").currentDP).toBe(11000);
    expect(observe(s.engine).hasPierce(s.perm("war"))).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  // ---------------------------------------------------------------------------
  // [When Attacking] — the same body on the other printed timing — and [End of Attack].
  // ---------------------------------------------------------------------------

  it("deletes a 5000 DP Digimon when it attacks and then plays a [Guilmon] Tamer from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "war" }],
          hand: [{ card: GUILMON_TAMER, as: "takato" }],
          deck: [LV3_RED],
          security: [LV3_RED],
        },
        1: {
          battleArea: [{ card: BODY, as: "victim", dp: 5000 }],
          security: [
            { card: LV3_RED, as: "topSecurity" },
            { card: SECOND_SECURITY, as: "bottomSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("war").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && !observe(s.engine).isAttacking());

    // [When Attacking] found a legal 5000 DP target, so no Piercing / +3000 DP fallback.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("victim").instanceId);
    expect(s.perm("war").currentDP).toBe(8000);
    expect(observe(s.engine).hasPierce(s.perm("war"))).toBe(false);
    // The security check consumed the top card only; the remaining stack keeps its order.
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("bottomSecurity").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("topSecurity").instanceId);
    // [End of Attack] played the Tamer WITHOUT paying its printed cost of 3.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId).sort()).toEqual(
      [CARD_ID, GUILMON_TAMER].sort(),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(3);
    expect(s.perm("war").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("plays only the Tamer whose text carries [Guilmon], not the Guilmon Digimon or a plain Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "war" }],
          hand: [
            { card: GUILMON_DIGIMON, as: "guilmonDigimon" },
            { card: PLAIN_TAMER, as: "takuya" },
            { card: GUILMON_TAMER, as: "takato" },
          ],
          deck: [LV3_RED],
          security: [LV3_RED],
        },
        1: { security: [{ card: LV3_RED, as: "topSecurity" }, SECOND_SECURITY] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("war").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.instanceId).sort()).toEqual(
      [s.perm("war").topCard!.instanceId, s.inst("takato").instanceId].sort(),
    );
    // The near match (Guilmon in its NAME, wrong card kind) and the non match (a Tamer with no
    // [Guilmon] in its printing) both stay in hand.
    expect(s.state.players[0]!.hand.map((card) => card.instanceId).sort()).toEqual(
      [s.inst("guilmonDigimon").instanceId, s.inst("takuya").instanceId].sort(),
    );
    // No opposing Digimon existed, so the [When Attacking] fallback branch applied instead.
    expect(s.perm("war").currentDP).toBe(11000);
    expect(observe(s.engine).hasPierce(s.perm("war"))).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] — proven on the opponent's turn, where [End of Attack] cannot fire
  // because this Digimon is the defender rather than the attacker.
  // ---------------------------------------------------------------------------

  it("plays one [Guilmon] Tamer from the trash when it is deleted defending on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "war", suspended: true }],
          trash: [
            { card: GUILMON_TAMER, as: "firstTakato" },
            { card: GUILMON_TAMER, as: "secondTakato" },
          ],
          deck: [LV3_RED],
          security: [LV3_RED],
        },
        1: {
          battleArea: [{ card: BODY, as: "bruiser", dp: 20_000 }],
          // A spare playable card: a seat with no legal main action is auto-passed before a
          // test can act in its Main phase.
          hand: [{ card: LV3_RED, as: "spare" }],
          deck: [LV3_RED, LV3_RED],
          security: [LV3_RED],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    // The defender's seat cannot attack, so the opponent's real turn has to be open: the
    // production turn loop is the only route to a Main phase for seat 1.
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const memoryBeforeDeletion = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("bruiser").permanentId,
        target: { kind: "permanent", permanentId: s.perm("war").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === GUILMON_TAMER));
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("war").instanceId);
    // Exactly ONE Tamer left the trash: [On Deletion] fired once and [End of Attack] did not
    // fire at all, because the deleted Digimon was the defender.
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([GUILMON_TAMER]);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === GUILMON_TAMER)).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([BODY]);
    // Played without paying: the Tamer's printed cost of 3 never moved memory.
    expect(s.state.memory).toBe(memoryBeforeDeletion);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  // ---------------------------------------------------------------------------
  // ＜Engage＞ (comprehensive rules 16-44) through the real turn loop.
  // ---------------------------------------------------------------------------

  it("attacks at the end of its controller's turn through Engage, and the +3000 DP expires with the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "war" }],
          // A spare playable card keeps Main from auto-passing; a plain Tamer is never a legal
          // [End of Attack] candidate, so the Engage attack's own window stays quiet.
          hand: [{ card: PLAIN_TAMER, as: "spare" }],
          deck: [LV3_RED, LV3_RED],
          security: [LV3_RED],
        },
        1: {
          security: [
            { card: LV3_RED, as: "topSecurity" },
            { card: SECOND_SECURITY, as: "bottomSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("war"), "Engage")).toBe(true);

    await advance(s.engine).runTurn(0);

    // The Engage attack happened: the opponent's top security card was checked and trashed.
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("bottomSecurity").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("topSecurity").instanceId);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.perm("war").isSuspended).toBe(true);
    // "for the turn" is `forTheTurn`, so the [When Attacking] fallback buff is gone by now.
    expect(s.perm("war").currentDP).toBe(8000);
    expect(observe(s.engine).hasPierce(s.perm("war"))).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Inherited: [All Turns] [Once Per Turn] When any of your opponent's Digimon are deleted,
  // if this Digimon has [Gallantmon] in its name, trash their top security card.
  // ---------------------------------------------------------------------------

  it("trashes the opponent's top security card once per turn under a [Gallantmon] host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALLANTMON, as: "host", under: [{ card: CARD_ID, as: "inherited" }] }],
          hand: [
            { card: FLARE, as: "firstFlare" },
            { card: FLARE, as: "secondFlare" },
          ],
          deck: [LV3_RED],
          security: [LV3_RED],
        },
        1: {
          battleArea: [
            { card: BODY, as: "firstVictim", dp: 4000 },
            { card: BODY, as: "secondVictim", dp: 4000 },
          ],
          security: [
            { card: LV3_RED, as: "topSecurity" },
            { card: SECOND_SECURITY, as: "middleSecurity" },
            { card: LV3_RED, as: "bottomSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([CARD_ID]);

    s.decisions.length = 0;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstFlare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 2);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("middleSecurity").instanceId,
      s.inst("bottomSecurity").instanceId,
    ]);
    // Security cards are face down in the stack and stay that way until checked.
    expect(s.state.players[1]!.security.every((card) => card.faceUp === false)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("topSecurity").instanceId);

    // Second deletion in the SAME turn: [Once Per Turn] refuses, so security is untouched.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondFlare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("middleSecurity").instanceId,
      s.inst("bottomSecurity").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resets the inherited [Once Per Turn] on its controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GALLANTMON, as: "host", under: [{ card: CARD_ID, as: "inherited" }] }],
          hand: [
            { card: FLARE, as: "firstFlare" },
            { card: FLARE, as: "secondFlare" },
          ],
          deck: [LV3_RED, LV3_RED, LV3_RED],
          security: [LV3_RED],
        },
        1: {
          battleArea: [
            { card: BODY, as: "firstVictim", dp: 4000 },
            { card: BODY, as: "secondVictim", dp: 4000 },
          ],
          security: [
            { card: LV3_RED, as: "topSecurity" },
            { card: SECOND_SECURITY, as: "middleSecurity" },
            { card: LV3_RED, as: "bottomSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstFlare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);

    // Through the real turn loop: the opponent's whole turn, then this controller's next one.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondFlare").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("bottomSecurity").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("middleSecurity").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });

  it("does nothing under a host without [Gallantmon] in its name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LV4_RED, as: "host", under: [{ card: CARD_ID, as: "inherited" }] }],
          hand: [{ card: FLARE, as: "flare" }],
          deck: [LV3_RED],
          security: [LV3_RED],
        },
        1: {
          battleArea: [{ card: BODY, as: "victim", dp: 4000 }],
          security: [
            { card: LV3_RED, as: "topSecurity" },
            { card: SECOND_SECURITY, as: "bottomSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("topSecurity").instanceId,
      s.inst("bottomSecurity").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("victim").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
