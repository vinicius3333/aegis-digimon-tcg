import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-042.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-042", () => {
  it.each([
    { base: "EX9-040", memory: 2 },
    { base: "BT1-071", memory: 1 },
  ])(
    "pays the applicable evolution route from $base and resolves the real digivolving effect",
    async ({ base, memory }) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: base, as: "host" }], hand: [{ card: "EX9-042", as: "evo" }], deck: ["BT1-009"] },
          1: { battleArea: [{ card: "BT1-009", as: "target" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: base === "EX9-040",
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("host").topCard.cardId).toBe("EX9-042");
      expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual([base]);
      expect(s.state.memory).toBe(memory);
      expect(s.perm("target").isSuspended).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("chooses different suspension and restriction targets, then expires the restriction (Q4795)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-042", as: "source" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-064", as: "second" },
        ],
        deck: ["BT1-009", "BT1-009"],
      },
    });
    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const firstDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("first").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.state.pendingDecision.decisionId !== firstDecision.decisionId,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("second").permanentId] },
      }),
    ).toEqual({ ok: true });
    await resolution;
    await settle();
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(true);
    await advance(s.engine).verb.suspend([s.perm("second").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("second").permanentId]);
    expect(s.perm("second").isSuspended).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("first").isSuspended).toBe(false);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(false);
    await advance(s.engine).verb.unsuspend([s.perm("second").permanentId]);
    expect(s.perm("second").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("suspends and restricts an opposing Digimon on play and digivolution", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend" },
          { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
        ],
      });
  });
  it("once per turn may digivolve after an effect suspends an own WG Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          triggerFilter: { nameOrTrait: [{ tokens: ["WG"], match: "trait" }] },
          actions: [{ kind: "Digivolve", payCost: false, from: ["hand"] }],
        },
      ],
    }));
  it("inherits once-per-turn unsuspend at end of your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend" }],
    }));

  it("suspends one opposing Digimon and prevents it from unsuspending", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-042", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "suspend" },
            { card: "BT1-010", as: "restrict" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("suspend").isSuspended);
    expect(s.perm("suspend").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspend"), "unsuspend")).toBe(true);
  });

  it("free-digivolves once when an opponent effect suspends its own WG Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-042", as: "watcher" }], hand: [{ card: "EX9-044", as: "evo" }] },
        1: { battleArea: [{ card: "EX9-042", as: "enemy" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true },
    );
    const memoryBefore = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("enemy"));
    await settle(() => s.perm("watcher").topCard.cardId === "EX9-044");
    await settle();
    expect(s.perm("watcher").topCard.cardId).toBe("EX9-044");
    expect(s.perm("watcher").isSuspended).toBe(true);
    expect(s.perm("watcher").stack.map(({ cardId }) => cardId)).toEqual(["EX9-042"]);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["nonWG", "enemyWG"])("does not evolve when an effect suspends %s", async (target) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-042", as: "watcher" },
            { card: "BT1-009", as: "nonWG" },
          ],
          hand: ["EX9-044"],
        },
        1: { battleArea: [{ card: "BT21-033", as: "enemyWG" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).verb.suspend([s.perm(target).permanentId]);
    await settle();
    expect(s.perm("watcher").topCard.cardId).toBe("EX9-042");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-044"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([true, false])("resolves inherited WG unsuspend at the real turn end, accepted: %s", async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-080", as: "host", under: ["EX9-042"] },
            { card: "BT21-033", as: "wg" },
            { card: "BT1-009", as: "nonWG" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: accept, autoDeclineOptional: !accept, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("wg").permanentId, s.perm("nonWG").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("wg").isSuspended).toBe(!accept);
    expect(s.perm("nonWG").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("clears an explicitly declined free evolution without moving the hand card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-042", as: "watcher" }], hand: ["EX9-044"] },
    });
    const memoryBefore = s.state.memory;
    const suspension = advance(s.engine).verb.suspend([s.perm("watcher").permanentId]);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await suspension;
    await settle();
    expect(s.perm("watcher").topCard.cardId).toBe("EX9-042");
    expect(s.perm("watcher").stack).toHaveLength(0);
    expect(s.perm("watcher").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX9-044"]);
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
