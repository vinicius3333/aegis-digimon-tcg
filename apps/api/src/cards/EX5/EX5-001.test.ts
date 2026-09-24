import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-001.js";
import "../index.js";

describe("EX5-001 Sunmon", () => {
  it("once per turn may digivolve itself from hand when an effect adds its top card to its stack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { isSelfRef: true, byEffect: true },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: true,
              reduceCost: 1,
              target: { filter: { isSelfRef: true } },
            },
          ],
        },
      ],
    });
  });

  it("reacts to EX5-007's public effect placement and reduces the evolution cost by 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-008", as: "host", under: ["EX5-001", "EX5-007"] }],
          hand: [{ card: "BT1-014", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    const placementEffect = JSON.parse(s.perm("host").activatableEffectsJson || "[]").find(
      (entry: { effectKey: string; instanceId: string; description?: string }) =>
        /Gain 2 memory/i.test(entry.description ?? ""),
    );
    expect(placementEffect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: placementEffect.instanceId,
        effectKey: placementEffect.effectKey,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("host").topCard?.cardId === "BT1-014");
    expect(s.perm("host").topCard?.cardId).toBe("BT1-014");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolution").instanceId)).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("can decline the optional evolution after the public placement effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-008", as: "host", under: ["EX5-001", "EX5-007"] }],
          hand: [{ card: "BT1-014", as: "evolution" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    const placementEffect = JSON.parse(s.perm("host").activatableEffectsJson || "[]").find(
      (entry: { effectKey: string; instanceId: string; description?: string }) =>
        /Gain 2 memory/i.test(entry.description ?? ""),
    );
    expect(placementEffect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: placementEffect.instanceId,
        effectKey: placementEffect.effectKey,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placementDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placementDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const sunmonDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: sunmonDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("host").topCard?.cardId).toBe("EX5-007");
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolution").instanceId)).toBe(true);
  });

  it("does not react to ordinary digivolution-card placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-007", as: "host", under: ["EX5-001"] }],
          hand: [
            { card: "BT1-014", as: "ordinaryEvolution" },
            { card: "BT1-020", as: "shouldNotEvolve" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("ordinaryEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-014");

    expect(s.perm("host").topCard?.cardId).toBe("BT1-014");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shouldNotEvolve").instanceId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not react after Koh & Sayo promotes Sunmon out of the stack before free evolution (Q5393)", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-007", as: "host", under: ["EX5-001"] }],
          hand: [
            { card: "EX5-064", as: "koh" },
            { card: "BT1-013", as: "evolution" },
            { card: "BT1-014", as: "shouldNotReact" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredIds },
    );
    preferredIds.push(s.inst("evolution").instanceId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koh").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-013");

    expect(s.perm("host").topCard?.cardId).toBe("BT1-013");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX5-007", "EX5-001"]);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shouldNotReact").instanceId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not react when an effect places a card under another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX5-001"] },
          { card: "BT1-009", as: "other" },
        ],
        hand: [{ card: "BT1-014", as: "evolution" }],
      },
    });
    await s.ready();
    expect(s.perm("host").topCard?.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolution").instanceId)).toBe(true);
  });
  it("refuses a second trigger from the same physical Sunmon this turn, then resets next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-007", as: "host", under: [{ card: "EX5-001", as: "sunmon" }, "EX5-007"] }],
          hand: [
            { card: "EX5-008", as: "firstEvolution" },
            { card: "EX5-008", as: "secondEvolution" },
            { card: "EX5-008", as: "thirdEvolution" },
            { card: "EX5-064", as: "koh" },
            { card: "EX5-012", as: "redLevel5" },
          ],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.inst("firstEvolution").instanceId,
      s.inst("secondEvolution").instanceId,
      s.inst("thirdEvolution").instanceId,
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    const firstPlacement = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => /Gain 2 memory/i.test(entry.description ?? ""));
    expect(firstPlacement).toBeDefined();
    const firstPlacementEffect = firstPlacement!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: firstPlacementEffect.instanceId!,
        effectKey: firstPlacementEffect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("firstEvolution").instanceId);
    expect(s.state.memory).toBe(6);
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("firstEvolution").instanceId);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("sunmon").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("koh").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("secondEvolution").instanceId);
    await s.ready();
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("secondEvolution").instanceId);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("sunmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redLevel5").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondEvolution").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("thirdEvolution").instanceId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    const memoryBeforeReset = s.state.memory;
    const resetPlacement = observe(s.engine)
      .activatableEffects(s.perm("host"))
      .find((entry) => /Gain 2 memory/i.test(entry.description ?? ""));
    expect(resetPlacement).toBeDefined();
    const resetPlacementEffect = resetPlacement!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: resetPlacementEffect.instanceId!,
        effectKey: resetPlacementEffect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.instanceId === s.inst("thirdEvolution").instanceId);
    await s.ready();
    expect(s.perm("host").topCard?.instanceId).toBe(s.inst("thirdEvolution").instanceId);
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("sunmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("thirdEvolution").instanceId)).toBe(
      false,
    );
    expect(s.state.memory).toBe(memoryBeforeReset + 1);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
