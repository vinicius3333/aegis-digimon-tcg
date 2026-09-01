import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming, type CardInstance } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "./BT12-007.js";
import "./BT12-010.js";
import "./BT12-016.js";
import "./BT12-089.js";

function mainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = (s.engine as unknown as { cardSourceOf(card: CardInstance): CardSource }).cardSourceOf(instance);
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find(({ effectKey }) =>
    effectKey.startsWith("BT12-089/"),
  );
  if (effect === undefined) throw new Error("BT12-089 exposes no Main effect");
  return effect.effectKey;
}

describe("BT12-089", () => {
  it("registers its printed Start of Your Turn effect from compiled IR", () => {
    const module = getEffectModule("BT12-089");
    expect(module?.cardId).toBe("BT12-089");
    const source = {
      instanceId: "source-089",
      cardId: "BT12-089",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartTurn, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.OnDeclaration, source).length).toBeGreaterThan(0);
  });

  it("sets memory to 3 at the start of your turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-089", as: "takato" }] } });
    await s.ready();
    s.state.memory = 1;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("takato"));
    expect(s.state.memory).toBe(3);
  });

  it("does not reset memory above 2 and exposes the printed security play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-089", as: "takato" }] } });
    await s.ready();
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("takato"));
    expect(s.state.memory).toBe(3);

    const module = getEffectModule("BT12-089");
    expect(
      module!.effectsForTiming(EffectTiming.SecuritySkill, observe(s.engine).cardSource(s.perm("takato"))),
    ).toHaveLength(1);
  });

  it("places the required cards under Guilmon, digivolves to Gallantmon, and stacks all printed DP bonuses", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-089", as: "takato" },
            { card: "BT12-007", as: "guilmon" },
          ],
          hand: [{ card: "BT12-018", as: "gallantmon" }],
          trash: [
            { card: "BT12-010", as: "growlmon" },
            { card: "BT12-016", as: "wargrowlmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
    await s.ready();
    s.state.memory = 4;
    const source = s.inst("takato");
    const materialIds = [s.inst("growlmon").instanceId, s.inst("wargrowlmon").instanceId];
    const requestedOrder = [s.inst("wargrowlmon").instanceId, source.instanceId, s.inst("growlmon").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey: mainEffectKey(s, source),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.state.pendingDecision!;
    expect(JSON.parse(order.payloadJson)).toMatchObject({
      candidateInstanceIds: expect.arrayContaining([source.instanceId, ...materialIds]),
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("guilmon").topCard?.cardId === "BT12-018");

    expect(s.perm("guilmon").topCard?.cardId).toBe("BT12-018");
    expect(s.perm("guilmon").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT12-089", "BT12-010", "BT12-016"]),
    );
    expect(s.perm("guilmon").stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([source.instanceId, ...materialIds]),
    );
    expect(
      s
        .perm("guilmon")
        .stack.map(({ instanceId }) => instanceId)
        .slice(0, 3),
    ).toEqual(requestedOrder);
    // The activated clause adds +2000; the required Guilmon and Growlmon
    // sources each add their own printed +2000 once Gallantmon is on top.
    expect(s.perm("guilmon").currentDP).toBe(s.perm("guilmon").baseDP + 6000);
    expect(s.state.memory).toBe(0);
  });

  it("does not activate when either named trash material is missing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-089", as: "takato" },
          { card: "BT12-007", as: "guilmon" },
        ],
        hand: [{ card: "BT12-018", as: "gallantmon" }],
        trash: ["BT12-010"],
      },
    });
    await s.ready();
    s.state.memory = 4;
    const source = s.inst("takato");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey: mainEffectKey(s, source),
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("guilmon").topCard?.cardId).toBe("BT12-007");
    expect(s.state.memory).toBe(4);
  });

  it("keeps the placed materials when the Gallantmon evolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-089", as: "takato" },
            { card: "BT12-007", as: "guilmon" },
          ],
          hand: [{ card: "BT12-018", as: "gallantmon" }],
          trash: [
            { card: "BT12-010", as: "growlmon" },
            { card: "BT12-016", as: "wargrowlmon" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    await s.ready();
    s.state.memory = 4;
    const source = s.inst("takato");
    const sourceId = source.instanceId;
    const growlmonId = s.inst("growlmon").instanceId;
    const wargrowlmonId = s.inst("wargrowlmon").instanceId;
    const requestedOrder = [wargrowlmonId, sourceId, growlmonId];

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: sourceId,
        effectKey: mainEffectKey(s, source),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.state.pendingDecision!;
    expect(order.seat).toBe(0);
    expect(order.kind).toBe("orderCards");
    expect(JSON.parse(order.payloadJson)).toMatchObject({
      candidateInstanceIds: expect.arrayContaining(requestedOrder),
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const evolution = s.state.pendingDecision!;
    expect(evolution.kind).toBe("optional");
    expect(evolution.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolution.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision === undefined && s.perm("guilmon").stack.length === 3);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("guilmon").topCard?.cardId).toBe("BT12-007");
    expect(s.perm("guilmon").stack.map(({ instanceId }) => instanceId)).toEqual(requestedOrder);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("gallantmon").instanceId);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === sourceId)).toBe(false);
    expect(s.state.memory).toBe(4);
  });

  it("plays itself from security through a real opponent attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { security: [{ card: "BT12-089", as: "securityTakato" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("securityTakato").instanceId),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-089")).toBe(true);
  });
});
