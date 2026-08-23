import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-168.js";

describe("P-168 Yao Qinglan", () => {
  it("gains memory at start of main only when the opponent has a Digimon", () => {
    const effect = runtimeCompiledCard("P-168")!.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } },
    });
  });

  it("suspends to evolve the exact Aqua or Sea Animal trigger subject without bypassing requirements", () => {
    const effect = runtimeCompiledCard("P-168")!.effects.find((entry) => entry.trigger === "YourTurn")!;
    const subTrigger = effect.actions[0];
    expect(subTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [
        {
          kind: "Digivolve",
          target: { sourceRef: "triggerSubject" },
          from: ["hand"],
          payCost: true,
          reduceCost: 1,
          optional: true,
          cost: { kind: "suspend", target: { isSelf: true } },
        },
      ],
    });
    expect(JSON.stringify(subTrigger)).not.toContain("ignoreRequirements");
  });
});
