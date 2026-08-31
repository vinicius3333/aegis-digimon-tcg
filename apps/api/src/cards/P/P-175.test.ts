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
});
