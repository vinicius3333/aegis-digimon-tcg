import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT4-062.js";
describe("BT4-062 Nidhoggmon", () => {
  it("uses canonical Return as the only post-suspension action for Q1399 teardown", () => {
    const whenDigivolving = runtimeCompiledCard("BT4-062")!.effects.find(
      (effect) => effect.trigger === "WhenDigivolving",
    )!;
    expect(whenDigivolving.actions.map((action) => action.kind)).toEqual(["Suspend", "Return"]);
  });

  it("Digi-Bursts 4 to bottom-deck all suspended opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", under: ["BT1-010", "BT1-011", "BT1-012"], as: "base" }],
          hand: [{ card: "BT4-062", as: "evolving" }],
        },
        1: {
          deck: ["BT1-013"],
          battleArea: [
            { card: "BT2-024", as: "low" },
            { card: "BT3-017", as: "already", suspended: true, under: ["BT1-001", "BT1-002"] },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    const opp = s.state.players[1] as PlayerState;
    s.state.memory = 5;
    const lowId = s.perm("low").topCard!.instanceId;
    const alreadyId = s.perm("already").topCard!.instanceId;
    const alreadySources = s.perm("already").stack.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const orderDecision = s.state.pendingDecision!;
    expect(new Set(orderDecision.options?.candidateInstanceIds)).toEqual(new Set([lowId, alreadyId]));
    const order = [alreadyId, lowId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderDecision.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(() => opp.battleArea.length === 0);
    expect(opp.deck).toHaveLength(3);
    expect(opp.deck.slice(-2).map((card) => card.instanceId)).toEqual(order);
    expect(alreadySources.every((id) => opp.trash.some((card) => card.instanceId === id))).toBe(true);
    expect(s.perm("base").stack).toHaveLength(0);
  });
});
