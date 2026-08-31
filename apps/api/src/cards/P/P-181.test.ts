import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
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
        { kind: "SecurityManipulation", op: "addBottom", controller: "mine", source: "this" },
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
          security: ["BT1-005", "BT1-006"],
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
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-005")).toBe(true);
  });

  it("plays a Royal Base Digimon from hand without cost when checked from Security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "P-181", as: "source" }], hand: [{ card: "BT18-044", as: "royalBase" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("source"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("royalBase").instanceId)).toBe(
      true,
    );
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
    await s.ready();
    s.state.memory = 10;
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
          ],
          hand: [
            { card: "BT19-048", as: "firstRoyal" },
            { card: "BT19-048", as: "secondRoyal" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("firstRoyal").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstBase").topCard.instanceId === s.inst("firstRoyal").instanceId);
    expect(s.state.memory).toBe(9);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("secondRoyal").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondBase").topCard.instanceId === s.inst("secondRoyal").instanceId);
    expect(s.state.memory).toBe(7);
  });
});
