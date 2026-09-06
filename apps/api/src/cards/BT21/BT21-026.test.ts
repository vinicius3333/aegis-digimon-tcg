import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-026.js";
import "../index.js";

describe("BT21-026 WarGreymon", () => {
  it("exposes complete effect coverage with no residual clauses", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.effects).toBeDefined();
  });

  it("preserves the registered effect triggers and action boundaries", () => {
    expect(compiled.effects.every((effect) => typeof effect.trigger === "string")).toBe(true);
    for (const effect of compiled.effects) {
      expect(Array.isArray(effect.actions)).toBe(true);
      for (const action of effect.actions ?? []) expect(typeof action.kind).toBe("string");
    }
  });

  it("reduces its play cost by two per opposing Digimon and preserves all three keywords", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { isSelfRef: true },
          scaling: { per: 1, filter: { controller: "opponent", kind: ["Digimon"] }, unit: "cards" },
          actions: [{ kind: "Replacement", event: "wouldBePlayed", mode: "reduceCost", amount: 2 }],
        },
      ],
    });
    for (const keyword of ["Rush", "Raid", "Blocker"])
      expect(compiled.effects).toContainEqual(
        expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword })] }),
      );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "onDeletionOf",
            sourceFilter: { controller: "opponent", kind: ["Digimon"] },
            actions: [
              { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
            ],
          },
        ],
      }),
    );
  });

  it.each([
    { opponents: 0, expectedCost: 11 },
    { opponents: 2, expectedCost: 7 },
    { opponents: 6, expectedCost: 0 },
  ])("pays $expectedCost with $opponents opposing Digimon", async ({ opponents, expectedCost }) => {
    const opposingCards = ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"].slice(0, opponents);
    const s = setupEngine({
      0: { hand: [{ card: "BT21-026", as: "wargreymon" }] },
      1: { battleArea: opposingCards },
    });
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-026"));

    expect(s.state.memory).toBe(10 - expectedCost);
  });

  it("attacks immediately after a public reduced-cost play because of Rush", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT21-026", as: "wargreymon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }], security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wargreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-026"));
    const playedId = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.cardId === "BT21-026",
    )!.permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: playedId, target: { kind: "player" } }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("uses Raid to attack the highest-DP unsuspended opponent instead of checking security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-026", as: "wargreymon" }] },
        1: {
          battleArea: [
            { card: "BT21-019", as: "highest" },
            { card: "BT1-010", as: "lower" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("highest").permanentId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wargreymon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("lower").permanentId);
  });

  it("uses Blocker to redirect an opponent's public player attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-026", as: "wargreymon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-002"] },
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
    ).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("wargreymon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("retains Rush, Raid, and Blocker after evolving from a legal red level 5", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT21-026", as: "wargreymon" }],
        battleArea: [{ card: "BT21-022", as: "level5" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("wargreymon").instanceId,
        permanentId: s.perm("level5").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("level5").topCard.cardId === "BT21-026");

    expect(s.state.memory).toBe(7);
    for (const keyword of ["Rush", "Raid", "Blocker"] as const) {
      expect(observe(s.engine).hasKeyword(s.perm("level5"), keyword)).toBe(true);
    }
  });

  it("may unsuspend when an opposing Digimon is deleted, only once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-026", as: "wargreymon", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    await settle(() => !s.perm("wargreymon").isSuspended);
    s.perm("wargreymon").isSuspended = true;
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");

    expect(s.perm("wargreymon").isSuspended).toBe(true);
  });

  it("unsuspends from a public attack that deletes an opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-026", as: "wargreymon", suspended: true },
            { card: "BT21-062", as: "attacker" },
          ],
        },
        1: { battleArea: [{ card: "BT21-007", as: "target", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("wargreymon").isSuspended);
    expect(s.perm("wargreymon").isSuspended).toBe(false);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
  });

  it("stays suspended when its controller's Digimon is deleted or the optional effect is declined", async () => {
    for (const [deletedSeat, options] of [
      [0, { autoAcceptOptional: true }],
      [1, { autoDeclineOptional: true }],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT21-026", as: "wargreymon", suspended: true },
              ...(deletedSeat === 0 ? [{ card: "BT1-009", as: "deleted" }] : []),
            ],
          },
          1: { battleArea: deletedSeat === 1 ? [{ card: "BT1-009", as: "deleted" }] : [] },
        },
        options,
      );
      await s.ready();
      await advance(s.engine).verb.deletePermanent([s.perm("deleted").permanentId], "byEffect");
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.perm("wargreymon").isSuspended).toBe(true);
    }
  });
});
