import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-066.js";
import "../index.js";

describe("BT24-066 Guilmon", () => {
  it("reveals qualifying trait cards or purple Tamers, trashes a second hit, and trashes one hand card", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Gigimon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ to: "hand" }, { to: "trash", requiresMinRevealed: 2 }],
          rest: "deckBottom",
        },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", levels: [3] }, count: 1 } }],
    });
  });

  it("moves two qualifying revealed cards to the printed destinations and leaves the remainder below", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-066", as: "source" },
            { card: "BT1-009", as: "handCost" },
          ],
          deck: [
            { card: "BT10-093", as: "purpleTamer" },
            { card: "BT24-066", as: "evil" },
            { card: "BT1-010", as: "miss" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("handCost").instanceId, s.inst("purpleTamer").instanceId, s.inst("evil").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCost").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("purpleTamer").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("evil").instanceId, s.inst("handCost").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it.each([
    ["normal purple level-2 requirement", "BT10-006", false],
    ["alternate exact Gigimon requirement", "BT24-001", true],
  ])("uses the %s for cost 0", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine({
      0: {
        breeding: { card: baseCard, as: "base" },
        hand: [{ card: "BT24-066", as: "guilmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("guilmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("guilmon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("public attack uses inherited deletion only on a level-3 opponent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-066"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT24-046", as: "level4" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level4").topCard.instanceId, s.perm("level3").topCard.instanceId);
    const level3Id = s.perm("level3").permanentId;
    const level4Id = s.perm("level4").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level3Id));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id)).toBe(true);
  });
});
