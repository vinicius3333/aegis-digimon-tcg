import { describe, expect, it } from "vitest";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./BT26-090.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-090 compiled behavior", () => {
  it("proves Q7143 memory threshold and suspended TS Option use shape", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "memoryAtMost", controller: "mine", value: 4 },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      kind: "UseOptionWithoutCost",
      from: ["hand"],
      payCost: true,
      reduceCostByOpponentMemory: true,
      optional: true,
      target: {
        count: 1,
        filter: {
          controller: "mine",
          zone: "hand",
          kind: ["Option"],
          nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
        },
      },
      cost: { kind: "suspend", target: { isSelf: true } },
    });
  });

  it("keeps the opponent-memory reduction gap explicit", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({
      reduceCostByOpponentMemory: true,
    });
    expect(irNode(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions[0]!).raw).toContain(
      "opponent has",
    );
  });

  it("gains memory only when its controller has four or less", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: "BT26-090", as: "kanan" }] } });
    low.state.memory = 4;
    await advance(low.engine).fire(EffectTiming.OnStartMainPhase, low.perm("kanan"));
    expect(low.state.memory).toBe(5);

    const high = setupEngine({ 0: { battleArea: [{ card: "BT26-090", as: "kanan" }] } });
    high.state.memory = 5;
    await advance(high.engine).fire(EffectTiming.OnStartMainPhase, high.perm("kanan"));
    expect(high.state.memory).toBe(5);
  });

  it("suspends itself and reduces a TS Option's paid cost by the opponent's memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-090", as: "kanan" }],
          hand: [{ card: "BT25-093", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("kanan"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));

    expect(s.perm("kanan").isSuspended).toBe(true);
    expect(s.state.memory).toBe(-5);
  });
});
