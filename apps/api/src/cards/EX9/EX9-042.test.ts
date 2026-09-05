import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-042.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-042", () => {
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

  it("unsuspends an inherited WG at end of its owner's turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-044", as: "host", under: ["EX9-042"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.perm("host").isSuspended = true;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    await settle(() => !s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
