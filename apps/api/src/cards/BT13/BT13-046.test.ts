import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-046.js";

describe("BT13-046 Kentaurosmon", () => {
  it("contains the security-count reveal effects and the attack cost/debuff sequence", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        { kind: "GainMemory", amount: 3, condition: { kind: "totalSecurityCount", op: "lte", value: 6 } },
        {
          kind: "HandRevealAdd",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
          securityFilter: { colors: ["Yellow"] },
          toTop: true,
          condition: { kind: "totalSecurityCount", op: "lte", value: 6 },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({ kind: "Unsuspend", abortOnDecline: true }),
        expect.objectContaining({ kind: "ModifyDP", amount: -7000 }),
      ],
    });
  });

  it("at six total security gains 3 memory and places a yellow hand card face down on top", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT13-046", as: "kent" },
            { card: "BT13-095", as: "dual-yellow" },
          ],
          security: [{ card: "BT1-009", as: "old-top" }, "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kent").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("dual-yellow").instanceId);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.security[1]!.instanceId).toBe(s.inst("old-top").instanceId);
  });

  it("must reveal at the threshold but returns a non-yellow card to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-041", as: "base" }],
          security: ["BT1-009"],
          hand: [
            { card: "BT13-046", as: "kent" },
            { card: "BT13-047", as: "nonYellow" },
            { card: "BT13-036", as: "yellow" },
          ],
          deck: [{ card: "BT1-012", as: "drawnNeutral" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kent").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-046");
    await settle();
    expect(s.state.memory).toBe(8);
    expect(s.perm("base").stack.some((card) => card.instanceId === baseInstanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonYellow").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnNeutral").instanceId)).toBe(true);
  });

  it("does nothing above six total security cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-046", as: "kent" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          hand: ["BT13-095"],
        },
        1: { security: ["BT1-013", "BT1-014", "BT1-015"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("kent"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.decisions.some(({ req }) => req.kind === "selectCards")).toBe(false);
  });

  it("pays top security to unsuspend itself and resets the attack effect next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-046", as: "kent" }],
          security: [
            { card: "BT1-009", as: "top-security" },
            { card: "BT1-010", as: "second-security" },
          ],
          hand: ["BT1-011"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT13-111", as: "target" }],
          security: ["BT1-013", "BT1-014", "BT1-015"],
          deck: ["BT1-016", "BT1-017"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const kentInstanceId = s.inst("kent").instanceId;
    const baseDP = s.perm("target").currentDP;
    const firstOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 && !s.perm("kent").isSuspended);
    expect(s.perm("kent").topCard.instanceId).toBe(kentInstanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("top-security").instanceId)).toBe(true);
    expect(s.perm("target").currentDP).toBe(baseDP - 7000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kent").isSuspended && s.perm("target").currentDP === baseDP - 7000);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("kent").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(baseDP - 7000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstOwnTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0 && !s.perm("kent").isSuspended);
    expect(s.perm("kent").topCard.instanceId).toBe(kentInstanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("second-security").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(baseDP - 7000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("declining the attack cost preserves security, suspension, and opposing DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-046", as: "kent" }],
          security: [{ card: "BT1-009", as: "decline-security" }],
          hand: ["BT1-010"],
          deck: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT13-111", as: "target" }], security: ["BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const baseDP = s.perm("target").currentDP;
    const securityInstanceId = s.inst("decline-security").instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kent").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kent").isSuspended);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(securityInstanceId);
    expect(s.perm("kent").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(baseDP);
  });

  it("digivolves from a yellow level 5 for exactly 5 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-041", as: "base" }],
        hand: [{ card: "BT13-046", as: "kent" }],
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { security: ["BT1-013", "BT1-014", "BT1-015"] },
    });
    s.state.memory = 6;
    const evolutionMaterialId1 = s.perm("base").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kent").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => s.perm("base").topCard.cardId === "BT13-046");
    expect(s.state.memory).toBe(1);
  });
});
