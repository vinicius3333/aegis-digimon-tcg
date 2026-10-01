import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-091.js";
import "./BT3-109.js";
import "../BT6/BT6-100.js";

describe("BT3-091 Lilithmon", () => {
  it("returns up to two purple Options with ten cards in trash", async () => {
    const trash = [{ card: "BT2-108", as: "one" }, { card: "BT2-109", as: "two" }, ...Array(8).fill("BT1-010")];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-012", as: "base" }],
          hand: [{ card: "BT3-091", as: "evolving" }],
          trash,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p = s.state.players[0] as PlayerState;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        p.hand.some((c) => c.instanceId === s.inst("one").instanceId) &&
        p.hand.some((c) => c.instanceId === s.inst("two").instanceId),
    );
    expect(p.trash).toHaveLength(8);
  });

  it("gains 2 memory after using an Option once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-091", as: "lilithmon" }],
          hand: [{ card: "BT3-109", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "BT3-109"));

    expect(s.state.memory).toBe(5);
  });

  it("refunds only the first Option each turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-091", as: "lilithmon" }],
          hand: [
            { card: "BT3-109", as: "first" },
            { card: "BT3-109", as: "second" },
            { card: "BT3-109", as: "third" },
          ],
          deck: Array(10).fill("BT1-010"),
        },
        1: { deck: Array(10).fill("BT1-010") },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    const thirdId = s.inst("third").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: firstId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === firstId));
    expect(s.state.memory).toBe(10);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === secondId));
    expect(s.state.memory).toBe(8);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const beforeThird = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: thirdId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === thirdId));
    expect(s.state.memory).toBe(beforeThird);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT3-091 Lilithmon — KB Q&A rulings", () => {
  it("gains memory only after the used Option's [Main] effect has resolved (Q1117)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-091", as: "lilithmon" },
          { card: "BT1-010", as: "ally" },
        ],
        hand: [{ card: "BT3-109", as: "option" }],
      },
    });
    const player = s.state.players[0] as PlayerState;
    const optionId = s.inst("option").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined);
    const mainTargetDecision = s.decisions.at(-1)!.req;
    expect(mainTargetDecision.sourceCardId).toBe("BT3-109");
    expect(mainTargetDecision.options?.candidateInstanceIds).toContain(s.perm("ally").permanentId);
    expect(s.state.memory).toBe(3);
    expect(player.trash.some((card) => card.instanceId === optionId)).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: mainTargetDecision.decisionId,
        response: { kind: mainTargetDecision.kind as "chooseTargets", instanceIds: [s.perm("ally").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 5 && s.state.pendingDecision === undefined);

    expect(player.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(5);
  });

  it("does not gain memory when an Option's effect activates without using the card (Q5449)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-091", as: "lilithmon" },
            { card: "BT6-100", as: "delayOption" },
          ],
          hand: [{ card: "BT3-109", as: "usedOption" }],
          security: [{ card: "BT6-100", as: "securityOption", faceUp: true }],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() =>
      player.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("securityOption").instanceId),
    );
    await drainMicrotasks();
    expect(s.state.memory).toBe(3);

    const delayOptionId = s.inst("delayOption").instanceId;
    const delay = (
      observe(s.engine).activatableEffects(s.perm("delayOption")) as Array<{ effectKey: string; description: string }>
    ).find((effect) => effect.description.includes("Delay"));
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: delayOptionId, effectKey: delay!.effectKey }),
    ).toEqual({ ok: true });
    await settle(() => player.trash.some((card) => card.instanceId === delayOptionId) && s.state.memory >= 6);
    await drainMicrotasks();
    expect(s.state.memory).toBe(6);

    const usedOptionId = s.inst("usedOption").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: usedOptionId })).toEqual({ ok: true });
    await settle(() => player.trash.some((card) => card.instanceId === usedOptionId) && s.state.memory === 6);
    expect(s.state.memory).toBe(6);
  });
});
