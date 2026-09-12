import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/index.js";

const CARD_ID = "AD1-023";

describe("AD1-023 J.P., Koji, & Koichi", () => {
  it("maps the catalog, KB color assignment, threshold, security, and inherited replacement", () => {
    const definition = getCardDefinition(CARD_ID);
    const compiled = registeredCompiledCards.get(CARD_ID)!;
    expect(definition?.cardId).toBe(CARD_ID);
    expect(definition?.nameEn).toBe("J.P., Koji, & Koichi");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });

    for (const trigger of ["StartOfYourMainPhase", "OnPlay"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "PlaceUnder",
        target: {
          count: 2,
          upTo: true,
          from: ["hand", "trash"],
          filter: { differentColors: true, nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
        },
        underFilter: { isSelfRef: true },
        trackCount: "placedHybrid",
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "Draw",
        amount: 1,
        condition: { kind: "namedCountAtLeast", countSource: "placedHybrid", count: 1 },
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "GainMemory",
        amount: 2,
        condition: { kind: "selfDigivolutionStackCountAtLeast", count: 4 },
      });
    }

    expect(compiled.effects.find((entry) => entry.trigger === "Security")).toMatchObject({
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] },
          cost: { kind: "securityToHand", controller: "mine", count: 1 },
        },
      ],
    });
  });

  it("places two differently colored Hybrid cards under itself and draws", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tamer" },
            { card: "AD1-002", as: "redHybrid" },
            { card: "BT12-024", as: "blueHybrid" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    const tamer = () => s.perm("tamer");
    await settle(() => tamer().stack.length === 2);

    expect(tamer()?.stack.map((card) => card.cardId)).toEqual(["AD1-002", "BT12-024"]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("BT1-010");
  });

  it("gains 2 memory from four existing Hybrid cards without placing another", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "tamer",
              under: ["AD1-002", "BT12-024", "AD1-002", "BT12-024"],
            },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.perm("tamer").stack).toHaveLength(4);
  });

  it("assigns different colors to two identical multicolor Hybrid cards (Q6113)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tamer" },
            { card: "BT18-022", as: "hybrid-a" },
            { card: "BT18-022", as: "hybrid-b" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );

    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").stack.length === 2);
    expect(s.perm("tamer").stack).toHaveLength(2);
  });

  it("prevents a Hybrid Digimon from leaving by adding the top security card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-101", as: "security" }],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-101")).toBe(true);
  });

  it("prevents a Ten Warriors Digimon from leaving by adding the top security card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-032", as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-101", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-101");
  });

  it("allows declining the inherited replacement without paying security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-032", as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-101", as: "security" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not replace a matching host's leave when its security is empty", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-032", as: "host", under: [CARD_ID] }], security: [] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("does not protect a non-Hybrid, non-Ten Warriors host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "host", under: [CARD_ID] }],
          security: [{ card: "BT1-101", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("uses the inherited replacement only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-032", as: "host", under: [CARD_ID] }],
          security: ["BT1-101", "BT1-101"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const driver = advance(s.engine);

    expect(await driver.verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(await driver.verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("resets the inherited replacement on the next real turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-032", as: "host", under: [CARD_ID], suspended: false, dp: 20000 }],
          security: ["BT1-101", "BT1-101", "BT1-101", "BT1-101"],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "attacker-1", dp: 30000 },
            { card: "BT1-013", as: "attacker-2", dp: 30000 },
          ],
          security: ["BT1-009", "BT1-010"],
          hand: ["BT1-011"],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const hostId = s.perm("host").permanentId;
    const hostSourceId = s.perm("host").stack[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);

    const attackHost = (attacker: string) =>
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm(attacker).permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      });

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(attackHost("attacker-1")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack[0]!.instanceId).toBe(hostSourceId);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(attackHost("attacker-2")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "tamer" }] }, 1: { battleArea: [{ card: "BT1-009", as: "attacker" }] } },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID)).toBe(true);
  });
});
