import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming, type CardInstance, type DecisionResponse } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../AD1/AD1-008.js";
import "../BT19/BT19-077.js";
import "../BT21/BT21-064.js";
import "./BT12-007.js";
import "./BT12-010.js";
import "./BT12-016.js";
import "./BT12-018.js";
import "./BT12-089.js";

function mainEffectKey(s: EngineSetup, instance: CardInstance, cardId = "BT12-089"): string {
  const source = (s.engine as unknown as { cardSourceOf(card: CardInstance): CardSource }).cardSourceOf(instance);
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find(({ effectKey }) =>
    effectKey.startsWith(`${cardId}/`),
  );
  if (effect === undefined) throw new Error(`${cardId} exposes no Main effect`);
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

function takatoBoard(guilmonCard: string, gallantmonCard: string): EngineSetup {
  return setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT12-089", as: "takato" },
          { card: guilmonCard, as: "guilmon" },
        ],
        hand: [{ card: gallantmonCard, as: "gallantmon" }],
        trash: [
          { card: "BT12-010", as: "growlmon" },
          { card: "BT12-016", as: "wargrowlmon" },
        ],
      },
    },
    { autoOrderCards: false },
  );
}

function respond(s: EngineSetup, response: DecisionResponse): void {
  const decision = s.state.pendingDecision!;
  expect(decision.kind).toBe(response.kind);
  expect(
    s.engine.applyIntent(decision.seat, { type: "respondDecision", decisionId: decision.decisionId, response }),
  ).toEqual({
    ok: true,
  });
}

async function activateTakatoAndPlaceMaterials(s: EngineSetup): Promise<string[]> {
  const takato = s.inst("takato");
  const placedOrder = [s.inst("growlmon").instanceId, s.inst("wargrowlmon").instanceId, takato.instanceId];
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: takato.instanceId,
      effectKey: mainEffectKey(s, takato),
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision !== undefined);
  if (s.state.pendingDecision?.kind === "selectCards") {
    respond(s, { kind: "selectCards", instanceIds: [s.perm("guilmon").topCard!.instanceId] });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
  }
  respond(s, { kind: "orderCards", order: placedOrder });
  await settle(() => s.state.pendingDecision?.kind === "optional");
  return placedOrder;
}

describe("BT12-089 Takato Matsuki — KB Q&A rulings", () => {
  it("may decline the Gallantmon digivolution and the placed cards stay under Guilmon (Q2223)", async () => {
    const s = takatoBoard("BT12-007", "BT12-018");
    await s.ready();
    s.state.memory = 4;
    const placedOrder = await activateTakatoAndPlaceMaterials(s);

    respond(s, { kind: "optional", accept: false });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("guilmon").topCard?.cardId).toBe("BT12-007");
    expect(s.perm("guilmon").stack.map(({ instanceId }) => instanceId)).toEqual(placedOrder);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("gallantmon").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(4);
  });

  it("does not let another card's digivolve effect ignore Gallantmon's level for a Guilmon (Q2224)", async () => {
    async function activateCalumonWithHand(intoCard: string): Promise<{
      s: EngineSetup;
      activation: ReturnType<EngineSetup["engine"]["applyIntent"]>;
    }> {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT12-089", as: "takato" },
              { card: "BT12-007", as: "guilmon" },
              { card: "BT19-077", as: "calumon" },
            ],
            hand: [{ card: intoCard, as: "into" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 5;
      const calumon = s.inst("calumon");
      const activation = s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: calumon.instanceId,
        effectKey: mainEffectKey(s, calumon, "BT19-077"),
      });
      await settle(() => s.state.pendingDecision === undefined);
      return { s, activation };
    }

    // Calumon's By-suspension stays declarable without a legal destination (CR 15-8-4-4-1,
    // 15-7-5); Q2224 only forbids the Gallantmon digivolution itself.
    const gallantmon = await activateCalumonWithHand("BT12-018");
    expect(gallantmon.activation).toEqual({ ok: true });
    expect(gallantmon.s.perm("calumon").isSuspended).toBe(true);
    expect(gallantmon.s.perm("guilmon").topCard?.cardId).toBe("BT12-007");
    expect(gallantmon.s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT12-018"]);
    expect(gallantmon.s.events.some((event) => event.kind === "digivolved")).toBe(false);

    const growlmon = await activateCalumonWithHand("BT12-010");
    expect(growlmon.activation).toEqual({ ok: true });
    expect(growlmon.s.perm("calumon").isSuspended).toBe(true);
    expect(growlmon.s.perm("guilmon").topCard?.cardId).toBe("BT12-010");
  });

  it("digivolves a [Hero] Guilmon into AD1-008 Gallantmon for its alternate digivolution cost of 3 (Q6066)", async () => {
    const s = takatoBoard("BT21-064", "AD1-008");
    await s.ready();
    s.state.memory = 3;
    await activateTakatoAndPlaceMaterials(s);

    respond(s, { kind: "optional", accept: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const { choices } = JSON.parse(s.state.pendingDecision!.payloadJson) as { choices: string[] };
    expect(choices).toEqual([
      "Printed digivolution requirement (cost 4)",
      "Alternate digivolution requirement (cost 3)",
    ]);
    respond(s, { kind: "chooseOption", optionIndex: choices.indexOf("Alternate digivolution requirement (cost 3)") });
    await settle(() => s.perm("guilmon").topCard?.cardId === "AD1-008");

    expect(s.perm("guilmon").topCard?.cardId).toBe("AD1-008");
    expect(s.events.flatMap((event) => (event.kind === "memoryChanged" ? [[event.from, event.to]] : []))).toEqual([
      [3, 0],
    ]);
    expect(s.state.memory).toBe(0);
  });
});
