import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { effectiveExactNames, getCardDefinition, type Seat } from "@aegis/shared";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-060.js";

describe("BT14-060", () => {
  it("is treated as Commandramon and reveals three to play a low-cost D-Brigade or DigiPolice Digimon when attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Commandramon"] }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ to: "play", optional: true, filter: { playCostLte: 3 } }],
    });
  });
  it("inherits once-per-turn leave-play prevention by deleting another D-Brigade Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          cost: { kind: "deleteOwn" },
        },
      ],
    }));

  it("naturally reveals and plays a traited Tamer at the printed play-cost boundary while attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-060", as: "hiCommandramon", under: ["BT14-056"] }],
          deck: ["BT14-086", "AD1-001", "AD1-002"],
        },
        1: { battleArea: [{ card: "BT14-054", as: "target", dp: 12000, suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hiCommandramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-086"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-086")).toBe(true);
  });

  it("naturally prevents an opponent battle deletion through inherited leave-play replacement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-064", as: "host", dp: 2000, suspended: true, under: ["BT14-060"] },
            { card: "BT14-056", as: "sacrifice" },
          ],
        },
        1: { battleArea: [{ card: "BT14-042", as: "attacker", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const hostId = s.perm("host").permanentId;
    const sacrificeId = s.perm("sacrifice").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
  });

  it("resets inherited leave prevention on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-064", as: "host", suspended: true, under: ["BT14-060"] },
            { card: "BT14-056", as: "firstCost" },
            { card: "BT14-056", as: "secondCost" },
            { card: "BT14-055", as: "nearTrait" },
            { card: "BT1-009", as: "neutral" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-091", "BT1-091", "BT1-091"],
        },
        1: {
          battleArea: [{ card: "BT1-043", as: "attacker" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-091", "BT1-091"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const hostId = s.perm("host").permanentId;
    const firstCostId = s.perm("firstCost").permanentId;
    const secondCostId = s.perm("secondCost").permanentId;

    const firstOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === firstCostId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === secondCostId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-055")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstOpponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const secondOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId) &&
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === secondCostId),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === firstCostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === secondCostId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-055")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-009")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondOpponentTurn;
  });
});

function selectCandidates(s: EngineSetup): string[] | undefined {
  return s.decisions.find((entry) => entry.req.kind === "selectCards")?.req.options?.candidateInstanceIds;
}

function isOnBattleArea(s: EngineSetup, seat: Seat, instanceId: string): boolean {
  return s.state.players[seat]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId);
}

async function deleteByOpponentAttack(s: EngineSetup, targetAlias: string): Promise<void> {
  s.state.turnSeat = 1;
  expect(
    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("opponentAttacker").permanentId,
      target: { kind: "permanent", permanentId: s.perm(targetAlias).permanentId },
    }),
  ).toEqual({ ok: true });
}

describe("BT14-060 Hi-Commandramon — KB Q&A rulings", () => {
  it("is treated as [Commandramon] by rule while in the deck, so a reveal for [Commandramon] can play it (Q2428)", async () => {
    expect(effectiveExactNames(getCardDefinition("BT14-060")!)).toEqual(
      expect.arrayContaining(["Hi-Commandramon", "Commandramon"]),
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-071", as: "tankdramon" },
            { card: "BT14-056", as: "doomedAttacker" },
          ],
          deck: [{ card: "BT14-064", as: "dBrigadeNearMiss" }, { card: "BT14-060", as: "hiCommandramon" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "BT14-054", as: "wall", dp: 12000, suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("doomedAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => isOnBattleArea(s, 0, s.inst("hiCommandramon").instanceId));

    expect(selectCandidates(s)).toEqual([s.inst("hiCommandramon").instanceId]);
    expect(isOnBattleArea(s, 0, s.inst("hiCommandramon").instanceId)).toBe(true);
    expect(isOnBattleArea(s, 0, s.inst("dBrigadeNearMiss").instanceId)).toBe(false);
  });

  it("can be chosen by an effect that plays exactly [Commandramon] (Q2429)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-063", as: "commandramon", suspended: true }],
          deck: [{ card: "BT14-064", as: "dBrigadeNearMiss" }, { card: "BT14-060", as: "hiCommandramon" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "BT14-042", as: "opponentAttacker", dp: 9000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await deleteByOpponentAttack(s, "commandramon");
    await settle(() => isOnBattleArea(s, 0, s.inst("hiCommandramon").instanceId));

    expect(selectCandidates(s)).toEqual([s.inst("hiCommandramon").instanceId]);
    expect(isOnBattleArea(s, 0, s.inst("hiCommandramon").instanceId)).toBe(true);
    expect(isOnBattleArea(s, 0, s.inst("dBrigadeNearMiss").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("dBrigadeNearMiss").instanceId);
  });

  it("can play a revealed [DigiPolice] Tamer with a play cost of 3 or less when attacking (Q2430)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-060", as: "hiCommandramon" }],
          deck: [
            { card: "BT15-087", as: "costlyDigiPoliceTamer" },
            { card: "BT14-086", as: "satsuki" },
            { card: "BT1-088", as: "untraitedTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT14-054", as: "target", dp: 12000, suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hiCommandramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => isOnBattleArea(s, 0, s.inst("satsuki").instanceId));

    expect(selectCandidates(s)).toEqual([s.inst("satsuki").instanceId]);
    expect(isOnBattleArea(s, 0, s.inst("satsuki").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("costlyDigiPoliceTamer").instanceId, s.inst("untraitedTamer").instanceId]),
    );
  });

  it("treats being returned to the hand as leaving the battle area, so the inherited effect prevents it (Q2431)", async () => {
    async function bounceHost(sacrificeCardId: string): Promise<EngineSetup> {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: { hand: [{ card: "ST2-16", as: "bounce" }], battleArea: ["ST2-03"] },
          1: {
            battleArea: [
              { card: sacrificeCardId, as: "sacrifice" },
              { card: "BT10-064", as: "host", under: ["BT14-060"] },
            ],
          },
        },
        { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
      );
      await s.ready();
      preferInstanceIds.push(s.perm("host").topCard.instanceId);
      s.state.memory = 10;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bounce").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("bounce").instanceId));
      return s;
    }

    const prevented = await bounceHost("BT14-056");
    const hostTopId = prevented.inst("host").instanceId;
    expect(isOnBattleArea(prevented, 1, hostTopId)).toBe(true);
    expect(prevented.state.players[1]!.hand.map((card) => card.instanceId)).not.toContain(hostTopId);
    expect(isOnBattleArea(prevented, 1, prevented.inst("sacrifice").instanceId)).toBe(false);
    expect(prevented.state.players[1]!.trash.map((card) => card.instanceId)).toContain(
      prevented.inst("sacrifice").instanceId,
    );

    const withoutDBrigade = await bounceHost("BT14-055");
    const bouncedTopId = withoutDBrigade.inst("host").instanceId;
    expect(isOnBattleArea(withoutDBrigade, 1, bouncedTopId)).toBe(false);
    expect(withoutDBrigade.state.players[1]!.hand.map((card) => card.instanceId)).toContain(bouncedTopId);
    expect(isOnBattleArea(withoutDBrigade, 1, withoutDBrigade.inst("sacrifice").instanceId)).toBe(true);
  });
});
