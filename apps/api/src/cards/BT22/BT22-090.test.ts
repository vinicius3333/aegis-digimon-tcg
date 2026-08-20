import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-090.js";

describe("BT22-090 Rie Kishibe", () => {
  it("gains memory only when the opponent has a Digimon at the start of the main phase", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions).toMatchObject([
      {
        kind: "GainMemory",
        amount: 1,
        condition: {
          kind: "opponentHas",
          filter: { controllerDefault: "opponent", kind: ["Digimon"] },
        },
      },
    ]);
  });

  it("requires deleting one other Knightmon-text/CS permanent before the once-per-turn digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      from: ["hand"],
      into: {
        controllerDefault: "mine",
        nameOrTrait: [{ tokens: ["LordKnightmon"], match: "name" }],
      },
      reduceCost: 3,
      cost: {
        kind: "deleteOwn",
        target: {
          filter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon", "Tamer"],
            nameOrTrait: [
              { tokens: ["Knightmon"], match: "text" },
              { tokens: ["CS"], match: "trait" },
            ],
          },
          count: 1,
        },
      },
      abortOnDecline: true,
    });
  });

  it("plays itself from security without paying its play cost", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(effect).toMatchObject({ isSecurity: true });
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { isSelf: true, filter: { isSelfRef: true } },
    });
  });

  it("observably gains exactly 1 memory only with an opposing Digimon", async () => {
    const positive = setupEngine({
      0: { battleArea: [{ card: "BT22-090", as: "rie" }] },
      1: { battleArea: ["BT1-009"] },
    });
    const before = positive.state.memory;
    await (
      positive.engine as unknown as { fireTiming(timing: EffectTiming, trigger: Record<string, never>): Promise<void> }
    ).fireTiming(EffectTiming.OnStartMainPhase, {});
    await settle(() => positive.state.memory !== before);
    expect(positive.state.memory).toBe(before + 1);

    const negative = setupEngine({ 0: { battleArea: [{ card: "BT22-090", as: "rie" }] } });
    await (
      negative.engine as unknown as { fireTiming(timing: EffectTiming, trigger: Record<string, never>): Promise<void> }
    ).fireTiming(EffectTiming.OnStartMainPhase, {});
    await settle(() => false, 40);
    expect(negative.state.memory).toBe(0);
  });
});
