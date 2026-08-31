import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-200.js";

describe("P-200 Kanan Yuki", () => {
  it("suspends one opponent Digimon at four or less memory", () => {
    expect(
      runtimeCompiledCard("P-200")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "Suspend",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          condition: { kind: "memoryAtMost", value: 4 },
        },
      ],
    });
  });

  it("reduces your TS Digimon digivolution by 1 by suspending this Tamer", () => {
    expect(runtimeCompiledCard("P-200")!.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          into: { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
          cost: { kind: "suspend", target: { isSelf: true } },
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("plays itself for free from Security", () => {
    expect(runtimeCompiledCard("P-200")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("suspends an opposing Digimon at the four-memory boundary", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-200", as: "kanan" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    s.state.memory = 4;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kanan"));
    await settle();
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
