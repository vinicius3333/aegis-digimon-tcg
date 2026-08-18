import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-009.js";
import "./BT10-087.js";

describe("BT10-009 Shoutmon X4", () => {
  it("draws two cards on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-009", as: "source" }], deck: ["BT10-007", "BT10-008"] } });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 9;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.deck.length === 0);
    expect(player.hand).toHaveLength(2);
  });

  it("uses Taiki to DigiXros from under a Tamer, pays the reduced cost, and draws two", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{
          card: "BT10-087",
          as: "taiki",
          under: [
            { card: "BT10-008", as: "shoutmon" },
            { card: "BT10-049", as: "ballistamon" },
          ],
        }],
        hand: [{ card: "BT10-009", as: "shoutmonX4" }],
        deck: ["BT10-034", "BT10-029"],
      },
    }, { autoOrderTriggers: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("shoutmonX4").instanceId,
      digiXros: {
        materialInstanceIds: [s.inst("shoutmon").instanceId, s.inst("ballistamon").instanceId],
        expanderPermanentIds: [s.perm("taiki").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() => player.deck.length === 0 && player.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("shoutmonX4").instanceId,
    ));

    const x4 = player.battleArea.find((permanent) => permanent.topCard.instanceId === s.inst("shoutmonX4").instanceId)!;
    expect(x4.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      s.inst("shoutmon").instanceId,
      s.inst("ballistamon").instanceId,
    ]));
    expect(s.perm("taiki").stack).toHaveLength(0);
    expect(s.perm("taiki").isSuspended).toBe(true);
    expect(player.hand).toHaveLength(2);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("after attacking, moves all sources under Taiki, unsuspends Taiki, and deletes itself", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT10-009",
            as: "shoutmonX4",
            under: [
              { card: "BT10-008", as: "shoutmon" },
              { card: "BT10-049", as: "ballistamon" },
            ],
          },
          { card: "BT10-087", as: "taiki", suspended: true },
        ],
      },
      1: { security: ["BT1-001"] },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    });
    const x4Id = s.perm("shoutmonX4").topCard.instanceId;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("shoutmonX4").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("taiki").stack.length === 2 &&
      !s.perm("taiki").isSuspended &&
      s.state.players[0]!.trash.some((card) => card.instanceId === x4Id),
    );

    expect(s.perm("taiki").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      s.inst("shoutmon").instanceId,
      s.inst("ballistamon").instanceId,
    ]));
    expect(s.perm("taiki").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === x4Id)).toBe(true);
    assertNoLoudGap(s);
  });

  it("may decline the end-of-attack effect and keep itself with all sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-009", as: "shoutmonX4", under: ["BT10-007", "BT10-008"] },
          { card: "BT10-087", as: "taiki", suspended: true },
        ],
      },
      1: { security: ["BT1-001"] },
    }, {
      autoDeclineOptional: true,
      autoOrderTriggers: true,
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("shoutmonX4").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle();

    expect(s.perm("shoutmonX4").stack).toHaveLength(2);
    expect(s.perm("taiki").stack).toHaveLength(0);
    expect(s.perm("taiki").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("may place the sources under one Tamer and unsuspend a different Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-009", as: "shoutmonX4", under: ["BT10-008", "BT10-049"] },
          { card: "BT10-087", as: "destinationTamer", suspended: true },
          { card: "BT10-089", as: "unsuspendedTamer", suspended: true },
        ],
      },
      1: { security: ["BT1-001"] },
    }, {
      autoAcceptOptional: true,
      autoOrderTriggers: true,
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("shoutmonX4").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets", 5000);
    const destinationDecision = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: destinationDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("destinationTamer").permanentId],
      },
    })).toEqual({ ok: true });

    await settle(() =>
      s.state.pendingDecision?.kind === "chooseTargets" &&
      s.state.pendingDecision.decisionId !== destinationDecision.decisionId,
    5000);
    const unsuspendDecision = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: unsuspendDecision.decisionId,
      response: {
        kind: "chooseTargets",
        instanceIds: [s.perm("unsuspendedTamer").permanentId],
      },
    })).toEqual({ ok: true });
    await settle(() =>
      s.perm("destinationTamer").stack.length === 2 &&
      !s.perm("unsuspendedTamer").isSuspended,
    5000);

    expect(s.perm("destinationTamer").stack).toHaveLength(2);
    expect(s.perm("destinationTamer").isSuspended).toBe(true);
    expect(s.perm("unsuspendedTamer").stack).toHaveLength(0);
    expect(s.perm("unsuspendedTamer").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("does not offer or resolve the end-of-attack effect without digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-009", as: "shoutmonX4" },
          { card: "BT10-087", as: "taiki", suspended: true },
        ],
      },
      1: { security: ["BT1-001"] },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("shoutmonX4").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea).toContain(s.perm("shoutmonX4"));
    expect(s.perm("taiki").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("uses Material Save 2 when deleted by another effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT10-009",
            as: "shoutmonX4",
            under: [
              { card: "BT10-008", as: "shoutmon" },
              { card: "BT10-049", as: "ballistamon" },
              { card: "BT10-034", as: "dorulumon" },
            ],
          },
          { card: "BT10-087", as: "taiki" },
        ],
      },
    }, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
    });
    const sourceIds = new Set([
      s.inst("shoutmon").instanceId,
      s.inst("ballistamon").instanceId,
      s.inst("dorulumon").instanceId,
    ]);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("shoutmonX4").permanentId])).toBe(1);
    await settle(() => s.perm("taiki").stack.length === 2);

    expect(s.perm("taiki").stack).toHaveLength(2);
    expect(s.perm("taiki").stack.every((card) => sourceIds.has(card.instanceId))).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => sourceIds.has(card.instanceId))).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
