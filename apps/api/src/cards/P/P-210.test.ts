import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-210.js";

describe("P-210 Hiroko Sagisaka", () => {
  it("gains memory at the start of your main phase when the opponent has a Digimon", () => {
    expect(
      runtimeCompiledCard("P-210")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: { kind: "opponentHas", filter: { controllerDefault: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("may return a TS Digimon from your trash on play", () => {
    expect(runtimeCompiledCard("P-210")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Return",
          to: "hand",
          optional: true,
          target: {
            count: 1,
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("plays itself without paying the cost in security", () => {
    expect(runtimeCompiledCard("P-210")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", payCost: false, target: { count: 1, isSelf: true, filter: { isSelfRef: true } } },
      ],
    });
  });
});
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-210 engine behavior", () => {
  it("gains exactly 1 memory at the start of the main phase with an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-210", as: "hiroko" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hiroko"));
    await settle();
    expect(s.state.memory).toBe(1);
  });
});
