import { describe, expect, it } from "vitest";
import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-099.js";
import "../ST1/ST1-10.js";
import "../BT18/BT18-026.js";
import "../BT18/BT18-059.js";
import "../BT20/BT20-029.js";
import "./BT13-018.js";

describe("BT13-099 Spencer Damon", () => {
  it("debuffs one opposing Digimon when one of your yellow Digimon becomes suspended", () => {
    const watcher = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0];
    expect(watcher?.kind).toBe("SubTrigger");
    if (watcher?.kind !== "SubTrigger") throw new Error("BT13-099 AllTurns watcher must be a SubTrigger");
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Yellow"] },
    });
    expect(watcher.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -1000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("becomes a 3000 DP Blocker Digimon through the opponent's turn at six or fewer total security", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    const grantStatic = effect?.actions.find((action) => action.kind === "GrantStatic");
    expect(grantStatic?.kind).toBe("GrantStatic");
    if (grantStatic?.kind !== "GrantStatic") throw new Error("BT13-099 must grant a static Digimon form");
    expect(grantStatic).toMatchObject({
      grant: "kind",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      tokens: ["Digimon"],
      staticEffect: { kind: "SetBaseDP", value: 3000 },
      duration: "untilOpponentTurnEnd",
    });
    const restrict = effect?.actions.find((action) => action.kind === "Restrict");
    expect(restrict?.kind).toBe("Restrict");
    if (restrict?.kind !== "Restrict") throw new Error("BT13-099 must restrict digivolution");
    expect(restrict).toMatchObject({
      restriction: "digivolve",
      duration: "untilOpponentTurnEnd",
    });
    const gainKeyword = effect?.actions.find((action) => action.kind === "GainKeyword");
    expect(gainKeyword?.kind).toBe("GainKeyword");
    if (gainKeyword?.kind !== "GainKeyword") throw new Error("BT13-099 must grant Blocker");
    expect(gainKeyword).toMatchObject({
      keyword: expect.objectContaining({ keyword: "Blocker" }),
      duration: "untilOpponentTurnEnd",
    });
    for (const action of effect?.actions ?? [])
      expect(action).toMatchObject({ condition: { kind: "totalSecurityCount", op: "lte", value: 6 } });
  });

  it("becomes a live 3000 DP Blocker when the end-of-turn condition is met", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-099", as: "spencer" }] } });
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("spencer"));
    await s.engine.recomputeContinuousEffects();
    await settle();
    expect(observe(s.engine).hasKeyword(s.perm("spencer"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("spencer"), "digivolve")).toBe(true);
  });

  it("gains the temporary Digimon and Blocker status through a real turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-099", as: "spencer" },
            { card: "BT1-047", as: "tinkOne" },
            { card: "BT1-047", as: "tinkTwo" },
            { card: "BT13-064", as: "pawn" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: Array.from({ length: 8 }, (_, index) => ({ card: "BT1-009", as: `ownDeck${index + 1}` })),
          security: Array.from({ length: 3 }, (_, index) => ({ card: "BT1-010", as: `ownSecurity${index + 1}` })),
        },
        1: {
          battleArea: [
            { card: "ST1-10", as: "phoenix", suspended: true },
            { card: "BT1-010", as: "opponentAttacker" },
          ],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: Array.from({ length: 8 }, (_, index) => ({ card: "BT1-009", as: `opponentDeck${index + 1}` })),
          security: Array.from({ length: 3 }, (_, index) => ({ card: "BT1-010", as: `opponentSecurity${index + 1}` })),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const spencer = s.perm("spencer");
    const tinkOne = s.perm("tinkOne");
    const tinkTwo = s.perm("tinkTwo");
    const phoenix = s.perm("phoenix");
    const pawn = s.perm("pawn");
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: tinkOne.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => tinkOne.isSuspended && phoenix.currentDP === 11_000 && !observe(s.engine).isAttacking());
    expect(phoenix.currentDP).toBe(11_000);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: tinkTwo.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => tinkTwo.isSuspended && !observe(s.engine).isAttacking());
    expect(phoenix.currentDP).toBe(11_000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(observe(s.engine).hasKeyword(s.perm("spencer"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("spencer"), "digivolve")).toBe(true);
    expect(spencer.currentDP).toBe(3_000);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: phoenix.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: pawn.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => pawn.topCard === undefined || !observe(s.engine).isAttacking());
    expect(phoenix.currentDP).toBe(10_000);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: spencer.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(spencer.topCard.cardId).toBe("BT13-099");
    expect(spencer.currentDP).toBe(3_000);
    expect(s.state.players[0]!.battleArea).toContain(spencer);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(phoenix.currentDP).toBe(12_000);
    expect(observe(s.engine).hasKeyword(spencer, "Blocker")).toBe(false);
    expect(observe(s.engine).isRestricted(spencer, "digivolve")).toBe(false);

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: tinkOne.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(phoenix.currentDP).toBe(11_000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
    expect(observe(s.engine).hasKeyword(spencer, "Blocker")).toBe(true);
    expect(spencer.currentDP).toBe(3_000);
  });
});

async function treatSpencerAsDigimon(s: EngineSetup, alias = "spencer"): Promise<void> {
  await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm(alias));
  await s.engine.recomputeContinuousEffects();
  await settle();
}

const filler = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({ card: "BT1-013", as: `${prefix}${index + 1}` }));

async function suspendSpencerBesideShineGreymon(asDigimon: boolean): Promise<number> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT13-099", as: "spencer" },
          { card: "BT13-018", as: "shineGreymon" },
        ],
      },
      1: { battleArea: [{ card: "BT1-024", as: "defender" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  if (asDigimon) await treatSpencerAsDigimon(s);
  await advance(s.engine).verb.suspend([s.perm("spencer").permanentId]);
  await settle();
  return s.perm("defender").currentDP;
}

async function spencerDebuffOnImmuneDefender(asDigimon: boolean, immuneTo: CardKind): Promise<number> {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT13-099", as: "spencer" },
          { card: "BT1-057", as: "yellowDigimon" },
        ],
      },
      1: { battleArea: [{ card: "BT1-024", as: "defender" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).verb.restrict(s.perm("defender").permanentId, "beAffected", EffectDuration.Permanent, {
    fromSourceKind: [immuneTo],
    byOpponentEffectsOnly: true,
  });
  if (asDigimon) await treatSpencerAsDigimon(s);
  await advance(s.engine).verb.suspend([s.perm("yellowDigimon").permanentId]);
  await settle();
  return s.perm("defender").currentDP;
}

async function opponentShineGreymonDebuffsOnly(
  onlyPermanent: PermanentSpec,
  asDigimon: boolean,
): Promise<{ deleted: boolean }> {
  const s = setupEngine(
    {
      0: { battleArea: [onlyPermanent] },
      1: {
        battleArea: [
          { card: "BT13-018", as: "opponentShineGreymon" },
          { card: "BT13-099", as: "opponentSpencer" },
        ],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const onlyCard = s.perm("target").topCard.instanceId;
  if (asDigimon) await treatSpencerAsDigimon(s, "target");
  await advance(s.engine).verb.suspend([s.perm("opponentSpencer").permanentId], 1);
  // The suspend verb has no rule-check checkpoint of its own; this timing window supplies it.
  await advance(s.engine).fireGlobal(EffectTiming.OnTappedAnyone);
  await settle();
  return { deleted: s.state.players[0]!.trash.some((card) => card.instanceId === onlyCard) };
}

async function plainDigimonMemoryGainUnderZenimon(): Promise<number> {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-013", as: "defender", suspended: true, under: ["BT20-029"] }],
        deck: filler("ownDeck", 5),
        security: filler("ownSecurity", 2),
      },
      1: {
        battleArea: [
          { card: "BT18-059", as: "zenimon" },
          { card: "BT1-010", as: "attacker" },
        ],
        deck: filler("opponentDeck", 5),
        security: filler("opponentSecurity", 2),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.turnSeat = 1;
  s.state.memory = 3;
  await s.ready();
  const attacker = s.perm("attacker");
  const attackerCard = attacker.topCard.instanceId;

  const opponentTurn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(1);
  const memoryBeforeAttack = s.state.memory;
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking());
  expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerCard);
  const memoryGained = memoryBeforeAttack - s.state.memory;
  advance(s.engine).endMainPhaseIfOpen(1);
  await opponentTurn;
  return memoryGained;
}

describe("BT13-099 Spencer Damon — KB Q&A rulings", () => {
  it("gains inherited effects from its digivolution cards while treated as a Digimon, and can attack unless it entered this turn (Q2347)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-099", as: "spencer", under: ["BT18-026"] }],
          hand: [
            { card: "BT13-099", as: "freshSpencer" },
            { card: "BT1-013", as: "spareCard" },
          ],
          deck: filler("ownDeck", 5),
        },
        1: { security: filler("opponentSecurity", 3), deck: filler("opponentDeck", 5) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 5;
    await s.ready();
    const spencer = s.perm("spencer");

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("freshSpencer").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    const freshSpencer = s.perm("freshSpencer");
    expect(spencer.currentDP).toBe(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: spencer.permanentId, target: { kind: "player" } }),
    ).toMatchObject({ ok: false });

    // Spencer's own treatment starts at end of turn; firing it during Main reaches the
    // attack-legal state the ruling describes for a Tamer treated as a Digimon on its own turn.
    await advance(s.engine).fire(EffectTiming.OnEndTurn, spencer);
    await advance(s.engine).fire(EffectTiming.OnEndTurn, freshSpencer);
    await s.engine.recomputeContinuousEffects();
    await settle();
    expect(spencer.currentDP).toBe(5_000);
    expect(freshSpencer.currentDP).toBe(3_000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: freshSpencer.permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: spencer.permanentId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await advance(s.engine).finishAttack();
    expect(spencer.isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("is treated as both a Digimon and a Tamer, so a yellow-Digimon watcher and a yellow-Tamer watcher both see it suspend (Q5998)", async () => {
    expect(await suspendSpencerBesideShineGreymon(false)).toBe(10_000 - 6_000);
    expect(await suspendSpencerBesideShineGreymon(true)).toBe(10_000 - 6_000 - 1_000);
  });

  it("activates effects that count as both Digimon and Tamer effects while treated as a Digimon (Q5999)", async () => {
    expect(await spencerDebuffOnImmuneDefender(false, CardKind.Digimon)).toBe(9_000);
    expect(await spencerDebuffOnImmuneDefender(false, CardKind.Tamer)).toBe(10_000);
    expect(await spencerDebuffOnImmuneDefender(true, CardKind.Digimon)).toBe(10_000);
    expect(await spencerDebuffOnImmuneDefender(true, CardKind.Tamer)).toBe(10_000);
  });

  it("is deleted by the rule check when an effect reduces its DP to 0 while treated as a Digimon (Q6000)", async () => {
    const regularDigimon = await opponentShineGreymonDebuffsOnly({ card: "BT1-019", as: "target" }, false);
    expect(regularDigimon.deleted).toBe(true);

    const plainTamer = await opponentShineGreymonDebuffsOnly({ card: "BT13-099", as: "target" }, false);
    expect(plainTamer.deleted).toBe(false);

    const tamerAsDigimon = await opponentShineGreymonDebuffsOnly({ card: "BT13-099", as: "target" }, true);
    expect(tamerAsDigimon.deleted).toBe(true);
  });

  it("overwrites an earlier Digimon treatment's DP with its own 3000 DP while keeping keywords gained earlier (Q6001)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-099", as: "spencer" }] } });
    await s.ready();
    const spencer = s.perm("spencer");
    // Only [Marcus Damon] cards grant a second treatment, so arm the earlier one directly.
    const ledgers = advance(s.engine).ledgers;
    ledgers.continuous.addKindGrant(spencer.permanentId, [CardKind.Digimon], EffectDuration.UntilOpponentTurnEnd);
    ledgers.modifiers.addBaseDpOverride(s.state, spencer.permanentId, 6_000, EffectDuration.UntilOpponentTurnEnd);
    ledgers.continuous.addKeywordGrant(spencer.permanentId, "Rush", EffectDuration.UntilOpponentTurnEnd);
    await s.engine.recomputeContinuousEffects();
    expect(spencer.currentDP).toBe(6_000);
    expect(observe(s.engine).hasKeyword(spencer, "Blocker")).toBe(false);

    await treatSpencerAsDigimon(s);

    expect(spencer.currentDP).toBe(3_000);
    expect(observe(s.engine).hasKeyword(spencer, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(spencer, "Blocker")).toBe(true);

    // Newest wins, not lowest: a treatment arriving after Spencer's raises the DP again.
    ledgers.modifiers.addBaseDpOverride(s.state, spencer.permanentId, 12_000, EffectDuration.UntilEachTurnEnd);
    await s.engine.recomputeContinuousEffects();
    expect(spencer.currentDP).toBe(12_000);
    expect(observe(s.engine).hasKeyword(spencer, "Blocker")).toBe(true);
  });

  it("gains memory from an inherited effect despite a Digimon-only memory lock, because its effect is also a Tamer effect (Q6002)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-099", as: "spencer", under: ["BT20-029"] }],
          deck: filler("ownDeck", 5),
          security: filler("ownSecurity", 2),
        },
        1: {
          battleArea: [
            { card: "BT18-059", as: "zenimon" },
            { card: "BT1-010", as: "attacker" },
          ],
          deck: filler("opponentDeck", 5),
          security: filler("opponentSecurity", 2),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;
    await s.ready();
    const spencer = s.perm("spencer");
    const attacker = s.perm("attacker");
    const attackerCard = attacker.topCard.instanceId;

    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).hasKeyword(spencer, "Blocker")).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).canGainMemoryFromEffect(0, [CardKind.Digimon])).toBe(false);
    const memoryBeforeAttack = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: spencer.permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(attackerCard);
    expect(s.state.memory).toBe(memoryBeforeAttack - 1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(await plainDigimonMemoryGainUnderZenimon()).toBe(0);
  });

  it("cannot give -1000 DP to an opponent's Digimon that isn't affected by Digimon effects while treated as a Digimon (Q6003)", async () => {
    expect(await spencerDebuffOnImmuneDefender(false, CardKind.Digimon)).toBe(10_000 - 1_000);
    expect(await spencerDebuffOnImmuneDefender(true, CardKind.Digimon)).toBe(10_000);
  });
});
