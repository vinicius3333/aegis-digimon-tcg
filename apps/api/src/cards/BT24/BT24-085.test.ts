import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-085.js";
import "../index.js";

describe("BT24-085 Dan Yuki & Kanan Yuki", () => {
  it("gates both optional trailing clauses behind the single suspend cost and opponent-memory cap", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtMost", value: 4 } }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "Suspend", optional: true, abortOnDecline: true },
        {
          kind: "UseOptionWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          filter: { playCostLte: 0, playCostLteScaling: { unit: "memory", per: 1 } },
        },
        { kind: "Attack", optional: true, target: { filter: { kind: ["Digimon"] }, count: 1 } },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("gains memory, suspends, and draws after reaching five memory at main phase start", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-085", as: "source" }], deck: ["BT1-009"] } },
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
