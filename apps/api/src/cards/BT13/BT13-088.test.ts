import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-088.js";
import "./BT13-091.js";

describe("BT13-088 Belphemon: Sleep Mode", () => {
  it("requires placing Belphemon: Rage Mode from trash before restricting attacks and granting immunity", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects?.find((entry) => entry.trigger === trigger)?.actions ?? [];
      expect(actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "attack",
        duration: "untilOpponentTurnEnd",
        abortOnDecline: true,
        cost: {
          kind: "place",
          destination: "digivolutionStack",
          position: "top",
          host: "self",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [{ match: "nameExact", tokens: ["Belphemon: Rage Mode"] }],
            },
            count: 1,
          },
          optional: true,
        },
      });
      expect(actions[1]).toMatchObject({
        kind: "GrantImmunity",
        immuneFrom: "opponentEffects",
        duration: "untilOpponentTurnEnd",
        condition: { kind: "ifThisEffectActed" },
      });
    }
  });

  it("ends an opponent's attack by trashing two cards from hand once per opponent turn", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    const watcher = effect?.actions?.[0];
    expect(watcher?.kind).toBe("SubTrigger");
    if (watcher?.kind !== "SubTrigger") throw new Error("Expected SubTrigger action");
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "EndAttack",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
    });
  });

  it("uses the exact Rage Mode from trash before granting the play restrictions", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-088", as: "sleep" }], trash: [{ card: "BT13-091", as: "rage" }] } },
      { autoAcceptOptional: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("sleep"));
    await settle(() => s.perm("sleep").stack.some((card) => card.cardId === "BT13-091"));
    expect(s.perm("sleep").stack.at(-1)?.cardId).toBe("BT13-091");
  });

  it("accepts the optional processing cost on a real play and then grants both restrictions", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-088", as: "sleep" }], trash: [{ card: "BT13-091", as: "rage" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sleep").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("sleep").stack.some((card) => card.cardId === "BT13-091"));
    expect(s.perm("sleep").stack.at(-1)?.cardId).toBe("BT13-091");
    expect(observe(s.engine).hasRestriction(s.perm("sleep"), "attack")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("sleep"), "beAffected")).toBe(true);
  });

  it("declines the optional processing cost without placing Rage Mode or granting restrictions", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-088", as: "sleep" }], trash: [{ card: "BT13-091", as: "rage" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sleep").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("sleep").stack.length === 0);
    expect(s.perm("sleep").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT13-091");
    expect(observe(s.engine).hasRestriction(s.perm("sleep"), "attack")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("sleep"), "beAffected")).toBe(false);
  });

  it("ends one real opponent attack for two hand cards and does not repeat the watcher that turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-088", as: "sleep" }],
          hand: [
            { card: "BT1-009", as: "discardFirst1" },
            { card: "BT1-009", as: "discardFirst2" },
            { card: "BT1-009", as: "discardNext1" },
            { card: "BT1-009", as: "discardNext2" },
          ],
          security: Array.from({ length: 6 }, (_, index) => ({ card: "BT1-010", as: `ownSecurity${index + 1}` })),
          deck: Array.from({ length: 8 }, (_, index) => ({ card: "BT1-010", as: `ownDraw${index + 1}` })),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attackerOne" },
            { card: "BT1-009", as: "attackerTwo" },
          ],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: Array.from({ length: 8 }, (_, index) => ({ card: "BT1-009", as: `opponentDraw${index + 1}` })),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const sleepId = s.perm("sleep").permanentId;
    const firstDiscard1Id = s.inst("discardFirst1").instanceId;
    const firstDiscard2Id = s.inst("discardFirst2").instanceId;
    const nextDiscard1Id = s.inst("discardNext1").instanceId;
    const nextDiscard2Id = s.inst("discardNext2").instanceId;
    const ownSecurity1Id = s.inst("ownSecurity1").instanceId;
    preferred.push(firstDiscard1Id, firstDiscard2Id);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    const firstOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([firstDiscard1Id, firstDiscard2Id]),
    );

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attackerTwo").isSuspended && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(ownSecurity1Id);

    advance(s.engine).endMainPhaseIfOpen(1);
    await firstOpponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    preferred.splice(0, preferred.length, nextDiscard1Id, nextDiscard2Id);
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1 && !observe(s.engine).isAttacking());
    expect(s.perm("sleep").permanentId).toBe(sleepId);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(5);
    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([firstDiscard1Id, firstDiscard2Id, nextDiscard1Id, nextDiscard2Id, ownSecurity1Id]),
    );
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });

  it("uses an exact alternate digivolution name", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Belphemon: Rage Mode"], cost: 1, isAlternate: true },
    ]);
  });
});
