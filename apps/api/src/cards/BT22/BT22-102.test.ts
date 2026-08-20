import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-102.js";

describe("BT22-102 Sayo", () => {
  it("gains memory at the start of the main phase only when the opponent has a Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: {
        kind: "opponentHas",
        filter: { controllerDefault: "opponent", kind: ["Digimon"] },
      },
    });
  });

  it("suspends this Tamer and digivolves the attacking source from trash with a two-cost reduction", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    const watcher = effect?.actions[0] as any;
    const digivolve = watcher.actions[0];

    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controller: "mine", kind: ["Digimon"], stackHasSameLevelCards: 2 },
      cost: { kind: "suspend", target: { isSelf: true } },
    });
    expect(digivolve).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isTriggerSource: true }, count: 1 },
      from: ["trash"],
      costDelta: -2,
      optional: true,
    });
    expect(digivolve.into.nameOrTrait).toEqual([
      { tokens: ["Night Claw", "Light Fang", "Galaxy", "CS"], match: "trait" },
    ]);
  });

  it("plays itself from Security without paying its cost", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(effect).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("executes its gated memory gain on public state", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-102", as: "sayo" }] },
      1: { battleArea: ["BT1-019"] },
    });
    s.state.memory = 0;
    await advance(s.engine).fireForInstance(EffectTiming.OnStartMainPhase, s.perm("sayo").topCard!);
    expect(s.state.memory).toBe(1);
  });
});
