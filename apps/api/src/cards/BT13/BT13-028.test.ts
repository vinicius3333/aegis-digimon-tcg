import { EffectTiming, type CardInstance } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-028.js";

function handMainEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = observe(s.engine).cardSource(instance);
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT13-028/"))!
    .effectKey;
}

describe("BT13-028 Thetismon", () => {
  it("uses the hand digivolution cost 3 and the three-card inherited return cost", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      isFromHand: true,
      condition: {
        kind: "youHave",
        filter: { nameOrTrait: [{ tokens: ["Kiyoshiro Higashimitarai"], match: "nameExact" }] },
      },
      actions: [
        {
          kind: "PlaceUnder",
          target: { filter: { zone: "hand", nameOrTrait: [{ tokens: ["TeslaJellymon"], match: "nameExact" }] } },
          underFilter: { nameOrTrait: [{ tokens: ["Jellymon"], match: "name" }] },
          position: "bottom",
          bindHostAs: "thetismonJellymonHost",
          abortOnDecline: true,
        },
        expect.objectContaining({
          kind: "Digivolve",
          payCost: true,
          costOverride: 3,
          ignoreRequirements: true,
          source: "triggerSource",
          target: expect.objectContaining({ fromSelectionRef: "thetismonJellymonHost" }),
        }),
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        expect.objectContaining({
          kind: "Unsuspend",
          optional: true,
          abortOnDecline: true,
          cost: expect.objectContaining({
            kind: "return",
            target: expect.objectContaining({ count: 3 }),
            orderReturnedCards: true,
          }),
        }),
      ],
    });
  });

  it("places TeslaJellymon at the bottom and evolves exact Jellymon from hand for 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-023", as: "jellymon" },
            { card: "BT9-086", as: "kiyoshiro" },
          ],
          hand: [
            { card: "BT13-028", as: "thetismon" },
            { card: "BT13-026", as: "tesla" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const thetismon = s.inst("thetismon");
    expect(thetismon.activatableEffectsJson).not.toBe("");

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: thetismon.instanceId,
        effectKey: handMainEffectKey(s, thetismon),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jellymon").topCard.instanceId === thetismon.instanceId);

    expect([...s.perm("jellymon").stack, s.perm("jellymon").topCard].map(({ cardId }) => cardId)).toEqual([
      "BT13-026",
      "BT13-023",
      "BT13-028",
    ]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not offer the hand Main effect without Kiyoshiro", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-023", as: "jellymon" }],
        hand: [
          { card: "BT13-028", as: "thetismon" },
          { card: "BT13-026", as: "tesla" },
        ],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const thetismon = s.inst("thetismon");

    expect(thetismon.activatableEffectsJson).toBe("");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: thetismon.instanceId,
        effectKey: handMainEffectKey(s, thetismon),
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.perm("jellymon").topCard.cardId).toBe("BT13-023");
  });

  it("does not offer the hand Main effect without the TeslaJellymon placement cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-023", as: "jellymon" },
          { card: "BT9-086", as: "kiyoshiro" },
        ],
        hand: [{ card: "BT13-028", as: "thetismon" }],
      },
    });
    await s.ready();
    expect(s.inst("thetismon").activatableEffectsJson).toBe("");
  });

  it("accepts a TeslaJellymon name-family host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-026", as: "tesla-host" },
            { card: "BT9-086", as: "kiyoshiro" },
          ],
          hand: [
            { card: "BT13-028", as: "thetismon" },
            { card: "BT13-026", as: "tesla-cost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("thetismon").instanceId,
        effectKey: handMainEffectKey(s, s.inst("thetismon")),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tesla-host").topCard.cardId === "BT13-028");

    expect(s.perm("tesla-host").stack.map(({ cardId }) => cardId)).toEqual(["BT13-026", "BT13-026"]);
    expect(s.perm("tesla-host").topCard.cardId).toBe("BT13-028");
    expect(s.state.memory).toBe(2);
  });

  it("returns three heterogeneous Jellymon-text cards in the chosen order to unsuspend after attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST2-10", as: "host", under: ["BT13-028"] }],
          deck: ["BT1-010"],
          trash: [
            { card: "EX12-023", as: "first" },
            { card: "EX12-027", as: "second" },
            { card: "BT13-028", as: "third" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false },
    );
    const order = [s.inst("third").instanceId, s.inst("first").instanceId, s.inst("second").instanceId];
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards", 3000);
    const ordering = s.decisions.at(-1)!.req;
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: s.inst("first").instanceId, cardId: "EX12-023" },
      { instanceId: s.inst("second").instanceId, cardId: "EX12-027" },
      { instanceId: s.inst("third").instanceId, cardId: "BT13-028" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended, 3000);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.slice(-3).map(({ instanceId }) => instanceId)).toEqual(order);
  });

  it("pays the inherited return cost only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST2-10", as: "host", under: [{ card: "BT13-028", as: "source" }] }],
          hand: ["BT1-010"],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
          trash: Array.from({ length: 6 }, () => "BT13-028"),
        },
        1: { security: ["BT1-010", "BT1-010", "BT1-010"], deck: ["BT1-010", "BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(3);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });
});
