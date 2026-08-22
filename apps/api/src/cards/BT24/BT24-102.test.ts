import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-102.js";
import "../index.js";

describe("BT24-102 Homeros", () => {
  it("models threshold draw, TS DP aura, Olympos effect activation, and Security play", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "GainMemory", amount: 1 },
        { kind: "Suspend", condition: { kind: "memoryAtLeast", value: 5 } },
        { kind: "Draw", amount: 1, condition: { kind: "memoryAtLeast", value: 5 } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent", target: { count: "all" } }],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "ActivateForeignEffect",
          zone: "battleArea",
          fromTriggers: ["OnPlay", "WhenDigivolving"],
          count: 1,
          cost: { kind: "suspend" },
          optional: true,
        },
      ],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("suspends and draws after the start-main-phase memory gain crosses five", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-102", as: "source" }], deck: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009"));

    expect(s.state.memory).toBe(5);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
