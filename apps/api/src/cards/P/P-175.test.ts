import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-175.js";

describe("P-175 Hina Kurihara", () => {
  it("sets memory to 3 only at 2 or less memory", () => {
    expect(runtimeCompiledCard("P-175")!.effects.find((effect) => effect.trigger === "StartOfYourTurn")).toMatchObject({
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2, controller: "mine" } }],
    });
  });

  it("triggers on your Rock Dragon or Machine Dragon play and suspends to digivolve from hand for -2", () => {
    const effect = runtimeCompiledCard("P-175")!.effects.find((entry) => entry.trigger === "YourTurn")!;
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Rock Dragon", "Machine Dragon"], match: "trait" }],
          },
          actions: [
            {
              kind: "Digivolve",
              reduceCost: 2,
              from: ["hand"],
              optional: true,
              abortOnDecline: true,
              cost: { kind: "suspend", target: { isSelf: true } },
              target: {
                filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 4 } },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  { tokens: ["Rock Dragon", "Earth Dragon", "Machine Dragon", "Sky Dragon"], match: "trait" },
                ],
              },
            },
          ],
        },
      ],
    });
  });

  it("plays itself for free from Security", () => {
    expect(runtimeCompiledCard("P-175")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true, count: 1 } }],
    });
  });

  it("sets memory to 3 at start of turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-175", as: "hina" }] } });
    s.state.memory = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("hina"));
    await settle();
    expect(s.state.memory).toBe(3);
  });

  it("suspends itself and reduces a qualifying level-4-or-higher digivolution by 2 after a real Rock Dragon play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-175", as: "hina" },
            { card: "BT2-014", as: "host" },
          ],
          hand: [
            { card: "BT2-011", as: "trigger" },
            { card: "BT2-016", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("trigger").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("evolution").instanceId);

    expect(s.perm("hina").isSuspended).toBe(true);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("evolution").instanceId);
    // BT2-016's level-4 evolution cost is 2; Hina's replacement reduces it to 0.
    expect(s.state.memory).toBe(6);
  });

  it("plays itself from a security check without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-175", as: "hina" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("hina"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("hina").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("hina").instanceId)).toBe(true);
  });
});
