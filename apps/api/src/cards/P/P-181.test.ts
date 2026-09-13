import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-181.js";

describe("P-181 Royal Base", () => {
  it("reduces one of your Royal Base digivolutions by 1 during your turn while in Security", () => {
    expect(runtimeCompiledCard("P-181")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      isSecurity: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("adds the top security card to hand, then places this card face up at the bottom", () => {
    expect(runtimeCompiledCard("P-181")!.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
        { kind: "SecurityManipulation", op: "addBottom", controller: "mine", faceUp: true, source: { isSelf: true } },
      ],
    });
  });

  it("optionally plays a level 5 or lower Royal Base Digimon from hand in Security", () => {
    expect(runtimeCompiledCard("P-181")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          optional: true,
          from: ["hand"],
          payCost: false,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("executes its Main security exchange through the public play intent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-181", as: "source" }],
          battleArea: [
            { card: "BT1-009" },
            { card: "BT1-037" },
            { card: "BT1-063" },
            { card: "BT1-088" },
            { card: "P-016" },
            { card: "ST6-03" },
            { card: "BT1-084" },
          ],
          security: ["BT1-048", "BT1-067"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 20;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-048")).toBe(true);
    const placed = s.state.players[0]!.security.at(-1)!;
    expect(placed.instanceId).toBe(s.inst("source").instanceId);
    expect(placed.faceUp).toBe(true);
  });

  it("plays a Royal Base Digimon from hand without cost when checked from Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "P-181", as: "source", faceUp: true }],
          hand: [{ card: "BT18-044", as: "royalBase" }],
          deck: Array(20).fill("BT1-013"),
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: Array(20).fill("BT1-013") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const memoryBeforeSecurity = s.state.memory;
    s.state.turnSeat = 1;
    await s.ready();
    const royalBaseInstanceId = s.inst("royalBase").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === royalBaseInstanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === royalBaseInstanceId)).toBe(true);
    expect(s.state.memory).toBe(memoryBeforeSecurity);
  });

  it("reduces a real Royal Base digivolution while the Option remains in Security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "P-181", as: "source", faceUp: true }],
          battleArea: [{ card: "BT18-044", as: "base" }],
          hand: [{ card: "BT19-048", as: "royalBase" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const baseInstanceId = s.inst("base").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("royalBase").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("royalBase").instanceId);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("royalBase").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(baseInstanceId);
    expect(s.state.memory).toBe(9);
  });

  it("uses its Once Per Turn reduction only on the first Royal Base digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "P-181", as: "source", faceUp: true }],
          battleArea: [
            { card: "BT18-044", as: "firstBase" },
            { card: "BT18-044", as: "secondBase" },
            { card: "BT18-044", as: "thirdBase" },
          ],
          hand: [
            { card: "BT19-048", as: "firstRoyal" },
            { card: "BT19-048", as: "secondRoyal" },
            { card: "BT19-048", as: "thirdRoyal" },
            "BT1-009",
          ],
          deck: Array(20).fill("BT1-013"),
        },
        1: { deck: Array(20).fill("BT1-013"), security: ["BT1-085"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const sourceInstanceId = s.inst("source").instanceId;
    const firstBaseInstanceId = s.inst("firstBase").instanceId;
    const firstRoyalInstanceId = s.inst("firstRoyal").instanceId;
    const secondBaseInstanceId = s.inst("secondBase").instanceId;
    const secondRoyalInstanceId = s.inst("secondRoyal").instanceId;
    const thirdBaseInstanceId = s.inst("thirdBase").instanceId;
    const thirdRoyalInstanceId = s.inst("thirdRoyal").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: firstRoyalInstanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("firstBase").topCard.instanceId === firstRoyalInstanceId && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(9);
    expect(s.perm("firstBase").stack.map((card) => card.instanceId)).toContain(firstBaseInstanceId);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === sourceInstanceId && card.faceUp)).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: secondRoyalInstanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("secondBase").topCard.instanceId === secondRoyalInstanceId && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(7);
    expect(s.perm("secondBase").stack.map((card) => card.instanceId)).toContain(secondBaseInstanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === sourceInstanceId && card.faceUp)).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("thirdBase").permanentId,
        instanceId: thirdRoyalInstanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.perm("thirdBase").topCard.instanceId === thirdRoyalInstanceId && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(2);
    expect(s.perm("thirdBase").stack.map((card) => card.instanceId)).toContain(thirdBaseInstanceId);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === sourceInstanceId && card.faceUp)).toBe(true);
    await s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });
});
