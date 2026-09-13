import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-209.js";

describe("P-209 Titamon", () => {
  it("has the alternate Demon or TS digivolution requirement and Alliance", () => {
    const card = runtimeCompiledCard("P-209")!;
    expect(getCardDefinition("P-209")).toMatchObject({
      nameEn: "Titamon",
      types: ["Shaman", "Titan", "TS", "Demon"],
    });
    expect(card.digivolutionRequirement).toEqual([{ level: 5, traits: ["Demon", "TS"], cost: 3, isAlternate: true }]);
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    });
  });

  it("gates both on-play effects behind trashing a card, then suspends and restricts an opponent's Digimon or Tamer", () => {
    const card = runtimeCompiledCard("P-209")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Trash",
            optional: true,
            abortOnDecline: true,
            target: { count: 1, filter: { controller: "mine", zone: "hand" } },
          },
          { kind: "Suspend", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } } },
          {
            kind: "Restrict",
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
            target: { count: 1, filter: { controllerDefault: "opponent", kind: ["Digimon", "Tamer"] } },
          },
        ],
      });
    }
  });

  it("once per turn may play a level 4 or lower Demon or Titan from trash when your hand is trashed", () => {
    expect(runtimeCompiledCard("P-209")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          sourceFilter: { controller: "mine" },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: {
                count: 1,
                filter: {
                  controller: "mine",
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [{ tokens: ["Demon", "Titan"], match: "trait" }],
                },
              },
            },
          ],
        },
      ],
    });
  });

  it("exposes Alliance on the live Titamon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-209", as: "titamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("titamon"), "Alliance")).toBe(true);
  });

  it.each([
    ["Digimon", "BT1-009"],
    ["Tamer", "BT1-085"],
  ] as const)("publicly pays play cost and suspends/restricts an opposing %s", async (_kind, targetCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-209", as: "titamon" },
            { card: "BT1-009", as: "cost" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: targetCard, as: "target" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const titamonId = s.inst("titamon").instanceId;
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: titamonId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === titamonId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 10, to: -1, reason: "playCard" });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("declining the hand-trash processing cost skips both opponent effects", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-209", as: "titamon" }], hand: [{ card: "BT1-009", as: "cost" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("titamon"));
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("shares the hand-trash play across one resident, suppresses the second use, then resets naturally", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-209", as: "titamon" }],
          hand: [
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-009", as: "secondCost" },
            { card: "BT1-009", as: "thirdCost" },
          ],
          trash: [
            { card: "BT24-010", as: "firstTitan" },
            { card: "BT1-069", as: "suppressedDemon" },
            { card: "BT24-042", as: "thirdDemon" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const titamonId = s.inst("titamon").instanceId;
    const titamonPermanentId = s.perm("titamon").permanentId;
    const firstTitanId = s.inst("firstTitan").instanceId;
    const suppressedDemonId = s.inst("suppressedDemon").instanceId;
    const thirdDemonId = s.inst("thirdDemon").instanceId;
    preferred.push(firstTitanId);
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    await advance(s.engine).verb.trash([s.inst("firstCost").instanceId], 0);
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === firstTitanId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.inst("titamon").instanceId).toBe(titamonId);
    expect(s.perm("titamon").permanentId).toBe(titamonPermanentId);
    expect(s.perm("titamon").topCard.instanceId).toBe(titamonId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(firstTitanId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(suppressedDemonId);

    await advance(s.engine).verb.trash([s.inst("secondCost").instanceId], 0);
    await settle();
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(suppressedDemonId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).not.toContain(
      suppressedDemonId,
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    preferred.length = 0;
    preferred.push(thirdDemonId);
    await advance(s.engine).verb.trash([s.inst("thirdCost").instanceId], 0);
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === thirdDemonId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.inst("titamon").instanceId).toBe(titamonId);
    expect(s.perm("titamon").permanentId).toBe(titamonPermanentId);
    expect(s.perm("titamon").topCard.instanceId).toBe(titamonId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(thirdDemonId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
