import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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

  it.each([
    [3, 4],
    [5, 5],
  ])("changes memory from %i to %i at the start-phase boundary", async (memory, expected) => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-085", as: "source" }] } });
    s.state.memory = memory;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.StartOfYourMainPhase, s.perm("source"));

    expect(s.state.memory).toBe(expected);
  });

  it("suspends, uses a TS Option within the opponent-memory cap, then lets a TS Digimon attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "source" },
            { card: "BT24-024", as: "attacker" },
          ],
          hand: [{ card: "BT24-092", as: "option" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("option").instanceId, s.perm("attacker").topCard.instanceId);
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("source"));
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("attacker")));

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("option").instanceId);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(true);
  });

  it("cannot use an Option above the opponent-memory cap but may still attack (Q5673)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "source" },
            { card: "BT24-024", as: "attacker" },
          ],
          hand: [{ card: "BT24-092", as: "option" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -2;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("source"));
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("attacker")));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(true);
  });

  it("processes neither trailing clause when the Tamer cannot pay the suspension cost (Q5672)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "source", suspended: true },
            { card: "BT24-013", as: "attacker" },
          ],
          hand: [{ card: "BT24-092", as: "option" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("source"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(false);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-085", as: "source" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    );
  });
});
