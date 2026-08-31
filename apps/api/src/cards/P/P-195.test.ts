import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-195.js";

describe("P-195 Inori Misono", () => {
  it("gains memory at the start of the main phase when the opponent has a Digimon", () => {
    expect(
      runtimeCompiledCard("P-195")!.effects.find((effect) => effect.trigger === "StartOfYourMainPhase"),
    ).toMatchObject({
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } } }],
    });
  });

  it("offers Elecmon play or free Aegiomon digivolution on play", () => {
    expect(runtimeCompiledCard("P-195")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                from: ["hand"],
                payCost: false,
                target: { count: 1, filter: { nameOrTrait: [{ tokens: ["Elecmon"], match: "name" }] } },
              },
            ],
            [
              {
                kind: "Digivolve",
                from: ["hand"],
                payCost: false,
                target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
                into: { nameOrTrait: [{ tokens: ["Aegiomon"], match: "name" }] },
              },
            ],
          ],
        },
      ],
    });
  });

  it("plays itself for free from Security", () => {
    expect(runtimeCompiledCard("P-195")!.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("gains one memory at start of main when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-195", as: "inori" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    await s.ready();
    const before = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("inori"));
    await settle();
    expect(s.state.memory).toBe(before + 1);
  });
});
