import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { assemblyRequirementFor } from "@aegis/shared";
import "../index.js";

describe("EX12-016 MetalGreymon", () => {
  it("deletes an opposing Digimon at 6000 DP or less on play and grants the delayed attack", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-016", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "deletion", dp: 6000 },
            { card: "BT1-009", as: "victim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard?.cardId !== "BT1-011"));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("victim").isSuspended).toBe(false);
    s.state.turnSeat = 1;
    void (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(EffectTiming.OnStartMainPhase);
    await settle(() => s.perm("victim").isSuspended);
    expect(s.perm("victim").isSuspended).toBe(true);
  });

  it("applies the deletion and delayed attack grant on digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-011", as: "base" }],
          hand: [{ card: "EX12-016", as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-011", as: "deletion", dp: 5000 },
            { card: "BT1-009", as: "victim" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard?.cardId !== "BT1-011"));
    expect(s.perm("base").topCard?.cardId).toBe("EX12-016");

    s.state.turnSeat = 1;
    void (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(EffectTiming.OnStartMainPhase);
    await settle(() => s.perm("victim").isSuspended);
    expect(s.perm("victim").isSuspended).toBe(true);
  });

  it("does not delete an opposing Digimon above the 6000 DP ceiling", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-016", as: "source" }] },
        1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle();
    expect(s.perm("opponent").currentDP).toBe(7000);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("plays by Assembly with one matching level-4-or-lower trash material and reduces cost by two", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "EX12-016", as: "source" }],
        trash: [{ card: "EX12-007", as: "material" }],
      },
    });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
      assembly: { materialInstanceIds: [s.inst("material").instanceId] },
    } as never)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-016"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-016")!;
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(false);
    expect(played.stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
  });

  it("encodes both Decode windows, the printed triggers, evolution alternatives, and Assembly recipe", () => {
    const compiled = registeredCompiledCards.get("EX12-016")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Greymon"], cost: 3, isAlternate: true },
      { traits: ["ME", "VB"], cost: 3, isAlternate: true, level: 4 },
    ]);
    expect(assemblyRequirementFor("EX12-016")).toEqual([
      {
        materials: [{
          count: 1,
          nameOrTrait: [
            { tokens: ["Agumon", "Greymon"], match: "name" },
            { tokens: ["ME", "VB"], match: "trait" },
          ],
          levelMax: 4,
        }],
        reduceCost: 2,
      },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toHaveLength(3);
    expect(compiled.effects.filter((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Decode"))).toHaveLength(2);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Delete", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } } } },
          {
            kind: "SubTrigger",
            event: "startOfYourMainPhase",
            on: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            duration: "untilOpponentTurnEnd",
            actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true } }],
          },
        ],
      });
    }
  });
});
