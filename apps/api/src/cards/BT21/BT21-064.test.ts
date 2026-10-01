import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-064.js";
import "../index.js";

describe("BT21-064 Guilmon", () => {
  it("preserves both zero-cost alternate Digivolution requirements", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Gigimon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["Hero"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("draws two after the printed Guilmon-family or Hero hand-trash cost", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0] as
      | { cost?: unknown }
      | undefined;

    expect(action).toMatchObject({ kind: "Draw", controller: "mine", amount: 2, optional: true, abortOnDecline: true });
    expect(action?.cost).toMatchObject({
      kind: "trash",
      target: {
        filter: {
          zone: "hand",
          controller: "mine",
          nameOrTrait: [
            { tokens: ["Guilmon", "Growlmon", "Gallantmon", "Megidramon"], match: "name" },
            { tokens: ["Hero"], match: "trait" },
          ],
        },
        count: 1,
      },
    });
    expect(compiled.effects).toContainEqual({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
      isInherited: true,
    });
  });

  it.each([
    ["Guilmon-family", "BT12-007"],
    ["Hero", "BT21-040"],
  ])("pays with a %s card and draws exactly two", async (_label, costCard) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-064", as: "guilmon" },
            { card: costCard, as: "cost" },
          ],
          deck: [
            { card: "BT1-009", as: "drawA" },
            { card: "BT1-010", as: "drawB" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawB").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawA").instanceId, s.inst("drawB").instanceId]),
    );
  });

  it("does not offer the hand-trash cost when the hand has no matching name or Hero trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-064", as: "guilmon" },
            { card: "BT1-009", as: "invalidCost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("guilmon").instanceId),
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("invalidCost").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("declining the hand-trash cost does not draw", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT21-064", as: "guilmon" },
            { card: "BT12-007", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("guilmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("guilmon").instanceId),
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.memory).toBe(1);
  });

  it("gains 1 memory when a realistic host carrying Guilmon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-068", as: "growlmon", under: [{ card: "BT21-064", as: "source" }] }] },
    });
    await s.ready();
    s.state.memory = 0;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("growlmon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("gains inherited memory from a public battle deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-064", as: "base" }],
        hand: [{ card: "BT21-068", as: "growlmon" }],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-019", as: "opponent", suspended: true }], security: [{ card: "BT1-009" }] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("growlmon").instanceId);
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved") && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("base").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("growlmon").instanceId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });

  it.each([
    ["BT21-001", 0],
    ["BT21-002", 1],
  ] as const)("zero-cost evolves through alternate route %#", async (base, requirementIndex) => {
    const s = setupEngine({
      0: {
        breeding: { card: base, as: "base" },
        hand: [{ card: "BT21-064", as: "guilmon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("guilmon").instanceId,
        alternateRequirementIndex: requirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("guilmon").instanceId);
    expect(s.state.memory).toBe(1);
  });
});

describe("BT21-064 Guilmon — KB Q&A rulings", () => {
  async function deleteHostCarrying(topCard: string, under: string[], firstTrigger: string) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: topCard,
              as: "host",
              under: under.map((card) => ({ card, as: card === "BT21-068" ? "growlmon" : card })),
            },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferTriggerKeys: [firstTrigger],
        preferInstanceIds: preferred,
      },
    );
    await s.ready();
    s.state.memory = 0;
    if (under.includes("BT21-068")) preferred.push(s.inst("growlmon").instanceId);
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === undefined);
    await settle();
    return s;
  }

  const handHas = (s: Awaited<ReturnType<typeof deleteHostCarrying>>, cardId: string) =>
    s.state.players[0]!.hand.some((card) => card.cardId === cardId);

  it("cannot activate its inherited memory gain once Gigimon returns the deleted top Growlmon to the hand (Q5758)", async () => {
    const gigimonFirst = await deleteHostCarrying("BT21-068", ["P-177", "BT21-064"], "P-177");
    expect(handHas(gigimonFirst, "BT21-068")).toBe(true);
    expect(gigimonFirst.state.memory).toBe(0);

    const guilmonFirst = await deleteHostCarrying("BT21-068", ["P-177", "BT21-064"], "BT21-064");
    expect(guilmonFirst.state.memory).toBe(1);
    expect(handHas(guilmonFirst, "BT21-068")).toBe(true);
  });

  it("still activates the inherited memory gains when Gigimon returns a Growlmon digivolution card from under the deleted WarGrowlmon (Q5759)", async () => {
    const s = await deleteHostCarrying("BT21-076", ["P-177", "BT21-064", "BT21-068"], "P-177");
    const triggerPrompts = s.decisions.flatMap(({ req }) =>
      req.kind === "orderTriggers" ? [[...(req.options?.triggerCardIds ?? [])].sort()] : [],
    );
    expect(triggerPrompts).toEqual([
      ["BT21-064", "BT21-068", "P-177"],
      ["BT21-064", "BT21-068"],
    ]);
    expect(handHas(s, "BT21-068")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-076")).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
