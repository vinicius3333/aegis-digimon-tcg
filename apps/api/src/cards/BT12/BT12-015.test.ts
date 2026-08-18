import { EffectTiming, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT12-015.js";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = (
    s.engine as unknown as { cardSourceOf(card: CardInstance): CardSource }
  ).cardSourceOf(instance);
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find(({ effectKey }) =>
    effectKey.startsWith("BT12-015/")
  );
  if (effect === undefined) throw new Error("BT12-015 surfaces no [Hand][Main] effect");
  return effect.effectKey;
}

describe("BT12-015 Aldamon", () => {
  it("uses its [Hand][Main] effect to stack both trash materials and digivolve Takuya", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT12-015", as: "aldamon" }],
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        trash: [
          { card: "BT12-012", as: "agunimon" },
          { card: "BT12-013", as: "burning" },
        ],
      },
    }, {
      autoSelectCards: true,
      autoOrderTriggers: true,
      autoOrderCards: false,
    });
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");
    const takuyaInstanceId = s.perm("takuya").topCard.instanceId;

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: aldamon.instanceId,
      effectKey: handMainEffectKey(s, aldamon),
    })).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.state.pendingDecision!;
    const requestedOrder = [s.inst("burning").instanceId, s.inst("agunimon").instanceId];
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("BT12-015");
    expect(JSON.parse(order.payloadJson)).toMatchObject({
      candidateInstanceIds: expect.arrayContaining(requestedOrder),
      visibleInstanceIds: expect.arrayContaining(requestedOrder),
      min: 2,
      max: 2,
    });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: order.decisionId,
      response: { kind: "orderCards", order: requestedOrder },
    })).toEqual({ ok: true });

    await settle(() => s.perm("takuya").topCard.instanceId === aldamon.instanceId);

    expect(s.perm("takuya").topCard.cardId).toBe("BT12-015");
    expect(s.perm("takuya").stack.map(({ instanceId }) => instanceId)).toEqual([
      ...requestedOrder,
      takuyaInstanceId,
    ]);
    expect(s.state.players[0]!.hand.some(({ instanceId }) =>
      instanceId === aldamon.instanceId
    )).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("does not activate or move the first material when BurningGreymon is absent", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT12-015", as: "aldamon" }],
        battleArea: [{ card: "BT12-088", as: "takuya" }],
        trash: [{ card: "BT12-012", as: "agunimon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const aldamon = s.inst("aldamon");

    expect(aldamon.activatableEffectsJson).toBe("");
    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: aldamon.instanceId,
      effectKey: handMainEffectKey(s, aldamon),
    }).ok).toBe(false);
    await settle();

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("agunimon").instanceId,
    );
    expect(s.perm("takuya").stack).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("returns Takuya from trash to hand on deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-015", as: "aldamon" }],
        trash: [{ card: "BT12-088", as: "takuya" }],
      },
    }, { autoSelectCards: true });

    await advance(s.engine).verb.deletePermanent([s.perm("aldamon").permanentId]);
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) =>
      instanceId === s.inst("takuya").instanceId
    ));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("takuya").instanceId,
    );
  });
});
