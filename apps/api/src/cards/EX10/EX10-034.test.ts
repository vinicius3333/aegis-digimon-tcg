import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import compiled from "./EX10-034.js";
import "../index.js";

const CARD_ID = "EX10-034";

/**
 * EX10-034 Blastmon (Lv.6 Black/Purple Mega, Vaccine, [Mineral]/[Bagra Army]).
 *
 * Printed:
 *   ＜Collision＞ ＜Fragment (3)＞ ＜Blocker＞
 *   [On Play] [When Digivolving] Until your opponent's turn ends, give 1 of their Digimon
 *     "[Start of Your Main Phase] This Digimon attacks."
 *   [All Turns] [Once Per Turn] When Digimon attack, by trashing any 2 of this Digimon's
 *     digivolution cards, this Digimon gains ＜Security A. +1＞ and +3000 DP until your turn ends.
 *   [DigiXros -2] 2 Digimon cards w/[Bagra Army] trait
 *
 * Every behavioural clause below is driven from its natural origin: the play/digivolve/attack
 * intents and the production turn loop. Injected timing (`advance.fire*`) is not used.
 *
 * Fixtures use only cards with no effect text at all (BT1-009, BT1-013, BT1-014, BT1-019,
 * BT10-064) wherever the assertion is about DP, trash size or trigger count.
 */
describe("EX10-034 Blastmon", () => {
  it("records the exact catalog and evolution routes", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black", "Purple"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 5 },
        { color: "Purple", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Mineral", "Bagra Army"],
    });
    // The printed rows are ordinary EvoCost routes, not bracketed [Digivolve] alternates.
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, colors: ["Black"], cost: 5, isAlternate: false },
      { level: 5, colors: ["Purple"], cost: 5, isAlternate: false },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    // `count` is the PER-MATERIAL discount; `maxMaterials` is the printed "2 Digimon cards".
    // Without the cap a single-slot recipe accepts every matching candidate at -2 each.
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ traits: ["Bagra Army"] }], count: 2, maxMaterials: 2 },
    ]);
  });

  it("Q5101: played from hand, the granted Digimon really attacks on its own Main Phase", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "blast" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-019", as: "target" }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 14;

    // Natural origin for [On Play]: the public play intent, cost paid from memory.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blast").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    await settle(
      () => observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId).length > 0,
    );
    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId)).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    // The opponent's Main Phase opens and the granted effect declares the attack itself.
    // Blastmon has ＜Blocker＞, so the attack parks on seat 0's block window.
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"), 2000);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isAttacking()).toBe(true);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    // Unblocked, the forced attack checked one of seat 0's security cards.
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    // "Until your opponent's turn ends": the grant is gone once that turn is over.
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId)).toHaveLength(0);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[When Digivolving]: the Black Lv.5 route pays 5, draws 1, keeps the source, and grants the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "source" }],
          hand: [{ card: CARD_ID, as: "blast" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceInstanceId = s.inst("source").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("blast").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === CARD_ID);
    await settle(
      () => observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId).length > 0,
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId)).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[When Digivolving]: the Purple Lv.5 route also pays 5 and grants the attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "source" }],
          hand: [{ card: CARD_ID, as: "blast" }],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-019", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const sourceInstanceId = s.inst("source").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("blast").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === CARD_ID);
    await settle(
      () => observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId).length > 0,
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.perm("source").currentDP).toBe(13_000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a Lv.4 source: the printed routes are Lv.5 Black and Lv.5 Purple only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "tooLow" }],
        hand: [{ card: CARD_ID, as: "blast" }],
        deck: ["BT1-013"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tooLow").permanentId,
        instanceId: s.inst("blast").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.players[0]!.battleArea[0]!.topCard!.cardId).toBe("BT1-014");
  });

  it("Q5102/Q5103 + duration: the opponent's attack pays 2 sources, the buff outlives that turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "blast",
              under: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013"],
            },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "attackerA" },
            { card: "BT1-019", as: "attackerB" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const baseDp = 13_000;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("blast").currentDP).toBe(baseDp);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // Q5103: the watcher is [All Turns] and unscoped — the OPPONENT's attack arms it.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerA").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    // Q5102: the "by trashing any 2" condition is paid with exactly 2, never 1.
    await settle(() => s.state.players[0]!.trash.length === 2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.perm("blast").stack).toHaveLength(3);
    expect(s.perm("blast").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(1);

    // ＜Blocker＞: Blastmon takes the attack itself and wins the battle at 16000 vs 6000.
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blast").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);

    // [Once Per Turn]: the second attack of the same turn cannot pay again.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerB").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // Blastmon suspended itself blocking the first attack, so the second block window opens
    // with no eligible blocker and closes on its own; the attack goes straight to security.
    await settleAcrossTimers(() => s.events.filter((event) => event.kind === "blockWindowOpened").length === 2);
    await settleAcrossTimers(() => s.state.players[0]!.security.length === 1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.trash.length).toBeGreaterThanOrEqual(2);
    expect(s.perm("blast").stack).toHaveLength(3);
    expect(s.perm("blast").currentDP).toBe(baseDp + 3000);

    // "Until YOUR turn ends" was taken on the opponent's turn: it survives that turn's end
    // and is still up throughout the controller's own turn.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("blast").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);

    // The controller's own turn end expires it, and the once-per-turn use has reset.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("blast").currentDP).toBe(baseDp);
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(0);

    const trashBefore = s.state.players[0]!.trash.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerB").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === trashBefore + 2);
    expect(s.state.players[0]!.trash).toHaveLength(trashBefore + 2);
    expect(s.perm("blast").stack).toHaveLength(1);
    expect(s.perm("blast").currentDP).toBe(baseDp + 3000);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("CR 15-7-4: the controller may decline the two-card processing condition on its own attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "blast", under: ["BT1-009", "BT1-013"] }],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();

    // Q5103's other half: the watcher also sees this Digimon's own attack.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("blast").stack).toHaveLength(2);
    expect(s.perm("blast").currentDP).toBe(13_000);
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5102 + ＜Collision＞: one digivolution card cannot pay, and the opponent is forced to block", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "blast", under: ["BT1-009"] }],
          security: ["BT1-009"],
        },
        1: {
          // No ＜Blocker＞ of its own: only ＜Collision＞ can make it block.
          battleArea: [{ card: "BT1-019", as: "chump" }],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    // Q5102: "any 2" cannot be paid out of a single digivolution card, so nothing is trashed
    // and no part of the effect happens.
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("blast").stack).toHaveLength(1);
    expect(s.perm("blast").currentDP).toBe(13_000);
    expect(observe(s.engine).keywordAmount(s.perm("blast"), "SecurityAttack")).toBe(0);

    // ＜Collision＞ (CR 16-30): the defender must block if able. The grant is read at block
    // legality (combat/legality.ts `hasCollision`), not published as a ＜Blocker＞ keyword on the
    // defender, so the proof is behavioural: the decline is refused and the non-Blocker blocks.
    expect(observe(s.engine).hasKeyword(s.perm("chump"), "Blocker")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual(expect.objectContaining({ ok: false }));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("chump").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    // Redirected onto the blocker: security was never checked, 13000 beats 6000.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("＜Fragment (3)＞: losing the battle trashes 3 of its own digivolution cards instead of deleting it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "blast",
              under: ["BT1-009", "BT1-013", "BT1-014", "BT1-009", "BT1-013", "BT1-014"],
            },
          ],
          security: ["BT1-009"],
        },
        1: {
          // Suspended, so ＜Collision＞ cannot make it block its own attacker.
          battleArea: [{ card: "BT1-019", as: "wall", dp: 25_000, suspended: true }],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blast").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    // 2 cards for the [All Turns] buff, then 3 more for ＜Fragment (3)＞.
    await settle(() => s.state.players[0]!.trash.length === 5);

    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("blast").topCard!.cardId).toBe(CARD_ID);
    expect(s.perm("blast").stack).toHaveLength(1);
    // 16000 DP still loses to the 25000 wall, which survives.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[DigiXros -2]: exactly 2 [Bagra Army] Digimon cards cost 4 less", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "blast" },
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blast").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    expect(s.state.memory).toBe(4);
    expect(
      s
        .perm("blast")
        .stack.map((card) => card.cardId)
        .sort(),
    ).toEqual(["EX10-026", "EX10-027"]);
  });

  it("rejects a third material and a card without the [Bagra Army] trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "blast" },
            { card: "EX10-026", as: "first" },
            { card: "EX10-027", as: "second" },
            { card: "EX10-039", as: "third" },
            { card: "BT1-009", as: "outsider" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 13;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blast").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId, s.inst("third").instanceId],
        },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blast").instanceId,
        digiXros: {
          materialInstanceIds: [s.inst("first").instanceId, s.inst("outsider").instanceId],
        },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("Q5101 negative: the grant lands on an unaffected BlackWarGreymon but never fires, while an ordinary Digimon's does", async () => {
    // EX10-010 BlackWarGreymon is unaffected by its opponent's Digimon effects while THAT
    // opponent controls a Digimon with 13000 DP or more. Seat 0 holds BT8-030 (printed
    // 13000 DP, no text), so the gate is open before Blastmon is ever played — and Blastmon
    // itself is a printed 13000 DP Digimon, so the gate cannot be shut while it is on board.
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-030", as: "gate" }],
          hand: [{ card: CARD_ID, as: "blastA" }, { card: CARD_ID, as: "blastB" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "EX10-010", as: "bwg" },
            { card: "BT1-019", as: "plain" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: prefer },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // The gate is open: BlackWarGreymon carries its own +3000 DP from the same condition.
    expect(s.perm("gate").currentDP).toBe(13_000);
    expect(s.perm("bwg").currentDP).toBe(15_000);

    // First Blastmon: the grant is aimed at the unaffected BlackWarGreymon.
    prefer.length = 0;
    prefer.push(s.perm("bwg").topCard!.instanceId);
    s.state.memory = 14;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blastA").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("bwg").permanentId).length > 0);
    // Q6740/Q5101: the selection itself is preserved — the trigger IS installed on an
    // unaffected Digimon. Only its firing is suppressed, which the turn loop proves below.
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("bwg").permanentId)).toHaveLength(1);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("plain").permanentId)).toHaveLength(0);

    // Second Blastmon: the same grant aimed at the ordinary Digimon on the same board.
    prefer.length = 0;
    prefer.push(s.perm("plain").topCard!.instanceId);
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("blastB").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    await settle(() => observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("plain").permanentId).length > 0);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("plain").permanentId)).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    // Seat 1's Main Phase: only the ordinary Digimon is forced to attack. Blastmon has
    // ＜Blocker＞, so that attack parks on seat 0's block window.
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"), 2000);
    expect(s.perm("plain").isSuspended).toBe(true);
    expect(s.perm("bwg").isSuspended).toBe(false);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    // Exactly one forced attack happened: one security card checked, BlackWarGreymon
    // untouched and still unsuspended, and no decision left pending.
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("bwg").isSuspended).toBe(false);
    expect(s.events.filter((event) => event.kind === "blockWindowOpened")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("peer EX10-008: with the gate shut its identical grant reaches BlackWarGreymon, ＜Collision＞ and forced attack included", async () => {
    // EX10-008 MetalGreymon (7000 DP) prints the same "[Start of Your Main Phase] This Digimon
    // attacks" grant plus ＜Collision＞. At 7000 DP it never arms EX10-010's 13000 DP gate,
    // so this is the control for the negative above.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-008", as: "metal" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "EX10-010", as: "bwg" }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Gate shut: no seat-0 Digimon at all, so no +3000 DP and no immunity.
    expect(s.perm("bwg").currentDP).toBe(12_000);

    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await settle(() => observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("bwg").permanentId).length > 0);
    expect(observe(s.engine).hasKeyword(s.perm("bwg"), "Collision")).toBe(true);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("bwg").permanentId)).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    // MetalGreymon has no ＜Blocker＞, so the forced attack resolves on its own. EX10-010 prints
    // ＜Raid＞, which redirects the player-directed attack onto seat 0's only unsuspended
    // Digimon: MetalGreymon (7000) loses to the 12000 DP attacker and security is untouched.
    // ＜Collision＞ landed too, so seat 0's non-＜Blocker＞ MetalGreymon is offered the block.
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"), 2000);
    expect(s.perm("bwg").isSuspended).toBe(true);
    // ＜Collision＞ is read at block legality: seat 0 may not decline, and its non-＜Blocker＞
    // MetalGreymon is a legal blocker. Both halves of EX10-008's grant landed.
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual(
      expect.objectContaining({ ok: false, reason: "wrong-phase" }),
    );
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("metal").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0, 3000);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX10-008");
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("peer EX10-008 mirror: opening the same gate blocks both halves — no ＜Collision＞ and no forced attack", async () => {
    // Identical to the case above except seat 0 also holds BT8-030 (printed 13000 DP), which
    // arms EX10-010's immunity. ＜Collision＞ is a GainKeyword with no unaffectable-selection
    // exemption, so with BlackWarGreymon as the only opposing Digimon there is no legal
    // target; `sameTarget: true` carries that emptiness into the trigger grant as well.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-030", as: "gate" }],
          hand: [{ card: "EX10-008", as: "metal" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "EX10-010", as: "bwg" }],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          hand: ["BT1-013"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("bwg").currentDP).toBe(15_000);

    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    // ＜Collision＞ is a GainKeyword with no unaffectable-selection exemption: with the
    // immune BlackWarGreymon as the only opposing Digimon it finds no legal target, so the
    // block-legality keyword is never conferred. The trigger grant runs with
    // `preserveUnaffectableSelection`, so it IS installed (Q6740) — and is then suppressed
    // at its own timing, exactly as in the Blastmon case above.
    expect(observe(s.engine).hasKeyword(s.perm("bwg"), "Collision")).toBe(false);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("bwg").permanentId)).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    // Seat 1's whole Main Phase passes with no forced attack: security is untouched.
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("bwg").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
