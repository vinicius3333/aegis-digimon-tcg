import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-099.js";
import "../ST1/ST1-10.js";

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
