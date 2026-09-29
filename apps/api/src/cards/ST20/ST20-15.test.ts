import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT15/BT15-092.js";
import "./ST20-12.js";
import "./ST20-15.js";

describe("ST20-15 Island of Adventure", () => {
  it("adds the top security card to hand and replaces itself face up on top", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-005", as: "whiteDigimon" }],
        hand: [{ card: "ST20-15", as: "option" }],
        security: [
          { card: "BT1-001", as: "securityTop" },
          { card: "BT1-002", as: "securityBelow" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    s.state.turnSeat = 0;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security[0]?.cardId === "ST20-15");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-001");
    expect(s.state.players[0]!.security[0]!.cardId).toBe("ST20-15");
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
  });

  it("gives a level 3-or-higher Digimon +2000 DP while revealed in security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "ST20-15", as: "securityOption", faceUp: true }],
        battleArea: [{ card: "ST20-11", as: "digimon" }],
      },
    });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("digimon").currentDP).toBe(14000);
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Blocker")).toBe(false);
  });

  it("plays a Tamer from hand when revealed as security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST20-15", as: "securityOption", faceUp: true }],
          hand: [{ card: "ST20-12", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tamer").instanceId)).toBe(true);
  });

  it("places itself face up even when there is no top security card to add", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-005", as: "whiteDigimon" }],
        hand: [{ card: "ST20-15", as: "option" }],
      },
    });
    s.state.memory = 10;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: optionId, faceUp: true });
  });

  it("cannot ignore its color requirement while an Island is already face up in security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST20-07", as: "adventure" }],
        hand: [{ card: "ST20-15", as: "option" }],
        security: [{ card: "ST20-15", as: "existingIsland", faceUp: true }],
      },
    });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });
});

describe("ST20-15 Island of Adventure — KB Q&A rulings", () => {
  it("stays a revealed face-up security card that still counts as security (Q4466)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-005", as: "whiteDigimon" }],
        hand: [{ card: "ST20-15", as: "option" }],
        security: [
          { card: "BT1-001", as: "securityTop" },
          { card: "BT1-002", as: "securityBelow" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const baseDP = s.perm("whiteDigimon").currentDP;
    const optionId = s.inst("option").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security[0]?.instanceId === optionId);
    await s.engine.recomputeContinuousEffects();

    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([
      [optionId, true],
      [s.inst("securityBelow").instanceId, false],
    ]);
    expect(s.perm("whiteDigimon").currentDP).toBe(baseDP + 2000);
  });

  it.each([
    { faceUp: true, bonus: 2000 },
    { faceUp: false, bonus: 0 },
  ])("applies its face-up security rule only while revealed (face up: $faceUp) (Q4466)", async ({ faceUp, bonus }) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-005", as: "whiteDigimon" }],
        security: [{ card: "ST20-15", faceUp }, "BT1-001"],
      },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("whiteDigimon").currentDP).toBe(s.perm("whiteDigimon").baseDP + bonus);
  });

  it.each([true, false])(
    "is checked like any security card and triggers its [Security] effect when face up: %s (Q4467, Q4468)",
    async (faceUp) => {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "ST20-12", as: "tamer" }],
            security: [
              { card: "ST20-15", as: "island", faceUp },
              { card: "BT1-001", as: "securityBelow" },
            ],
          },
          1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
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
      await settle(
        () =>
          s.events.some((event) => event.kind === "securityChecked") &&
          !observe(s.engine).isAttacking() &&
          s.state.pendingDecision === undefined,
      );

      expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("securityBelow").instanceId]);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("island").instanceId]);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tamer").instanceId)).toBe(
        true,
      );
    },
  );

  it("turns a face-up Island face down when the security stack is shuffled (Q4469)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["AD1-005", "BT1-045"],
          hand: [
            { card: "ST20-15", as: "island" },
            { card: "BT15-092", as: "shuffler" },
          ],
          security: ["BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const islandId = s.inst("island").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: islandId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security[0]?.instanceId === islandId);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);

    const shufflerId = s.inst("shuffler").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: shufflerId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === shufflerId) &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === islandId)).toBe(true);
    expect(s.state.players[0]!.security.every((card) => card.faceUp === false)).toBe(true);
  });

  it("can be used with 0 security cards and only places itself as security (Q4697)", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["AD1-005"],
        hand: [{ card: "ST20-15", as: "island" }],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.state.players[0]!.security).toHaveLength(0);
    const islandId = s.inst("island").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: islandId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([[islandId, true]]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(8);
  });
});
