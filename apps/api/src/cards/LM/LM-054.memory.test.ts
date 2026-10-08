import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-054.js";
import "../EX5/EX5-054.js";
import "../EX13/EX13-033.js";

describe("GitHub #5306 Treadmill Training memory contract", () => {
  it.each([0, 1, 3])("pays the use cost of 2 from hand at %i memory before resolving the search", async (memory) => {
    const s = setupEngine({ 0: { hand: [{ card: "LM-054", as: "training" }], deck: ["BT1-051", "BT1-013"] } });
    s.state.memory = memory;
    await s.ready();
    const trainingId = s.inst("training").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: trainingId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(s.state.memory).toBe(memory - 2);
    const request = s.decisions.at(-1)!.req;
    expect(request.options?.candidateInstanceIds).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: request.options!.candidateInstanceIds! },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === trainingId) &&
        s.state.pendingDecision === undefined,
    );
    await drainMicrotasks();
    expect(s.state.memory).toBe(memory - 2);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(["BT1-051"]);
    expect(s.state.players[0]!.deck.map((c) => c.cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === trainingId)).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: trainingId,
        effectKey: `LM-054/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.memory).toBe(memory - 2);
  });

  it.each([
    { evolution: "BT1-054", cost: 1 },
    { evolution: "BT1-051", cost: 0 },
  ])("Delay digivolves into $evolution and pays $cost after reducing its cost by 2", async ({ evolution, cost }) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-054", as: "training" },
            { card: "BT1-046", as: "host" },
          ],
          hand: [{ card: evolution, as: "evolution" }],
          deck: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const trainingId = s.inst("training").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: trainingId,
        effectKey: `LM-054/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === evolution && s.state.pendingDecision === undefined);
    await drainMicrotasks();
    expect(s.state.memory).toBe(3 - cost);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(trainingId);
    expect(s.perm("host").stack.map((c) => c.cardId)).toEqual(["BT1-046"]);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(["BT1-013"]);
  });

  it.each([
    [0, 2],
    [1, 1],
  ])("Delay cost choice %i pays %i for the production-observed Etemon to MetalEtemon pair", async (choice, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-054", as: "training" },
            { card: "BT14-038", as: "host" },
          ],
          hand: [{ card: "EX5-054", as: "evolution" }],
          deck: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: choice },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("training").instanceId,
        effectKey: `LM-054/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX5-054" && s.state.pendingDecision === undefined);
    await drainMicrotasks();
    const costChoice = s.decisions.find(({ req }) => req.options?.digivolveCostChoice);
    expect(costChoice?.req.options?.digivolveCostChoice).toMatchObject({ costs: [4, 3], costDelta: -2 });
    expect(s.state.memory).toBe(3 - cost);
  });

  it("declining Delay digivolution trashes the Option without spending or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-054", as: "training" },
            { card: "BT1-046", as: "host" },
          ],
          hand: [{ card: "BT1-054", as: "evolution" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const trainingId = s.inst("training").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: trainingId,
        effectKey: `LM-054/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.trash.some((c) => c.instanceId === trainingId) && s.state.pendingDecision === undefined,
    );
    await drainMicrotasks();
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").topCard.cardId).toBe("BT1-046");
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(["BT1-054"]);
  });

  it.each([
    [0, 2],
    [1, 1],
  ])("Delay Mistymon requirement choice %i pays %i for the other production-observed pair", async (choice, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-054", as: "training" },
            { card: "BT19-036", as: "host" },
          ],
          hand: [{ card: "EX13-033", as: "evolution" }],
          deck: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: choice, declinePrompts: ["Mistymon"] },
    );
    // Keep the digivolution cost isolated from Mistymon's optional security/attack follow-ups.
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("training").instanceId,
        effectKey: `LM-054/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX13-033" && s.state.pendingDecision === undefined);
    await drainMicrotasks();
    expect(
      s.decisions.find(({ req }) => req.options?.digivolveCostChoice)?.req.options?.digivolveCostChoice,
    ).toMatchObject({
      fromCardId: "BT19-036",
      intoCardId: "EX13-033",
      costs: [4, 3],
      costDelta: -2,
    });
    expect(s.state.memory).toBe(3 - cost);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toEqual(["LM-054"]);
    expect(s.perm("host").stack.map((c) => c.cardId)).toEqual(["BT19-036"]);
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(["BT1-013"]);
  });
});
