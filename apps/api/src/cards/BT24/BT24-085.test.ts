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
    [4, 5],
    [5, 5],
  ])("changes memory from %i to %i at the start-phase boundary", async (memory, expected) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-085", as: "source" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-012"], deck: ["BT1-013", "BT1-014"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = memory;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(expected);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
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
        1: {
          battleArea: [{ card: "BT3-089", as: "opponent" }],
          security: [{ card: "BT1-012", as: "security" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("option").instanceId, s.perm("attacker").topCard.instanceId);
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("attacker")));

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("option").instanceId);
    expect(s.perm("attacker").linked.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("opponent").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(true);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    await turn;
    expect(s.state.memory).toBe(-3);
  });

  it("cannot use an Option above the opponent-memory cap but may still attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "source" },
            { card: "BT24-024", as: "attacker" },
          ],
          hand: [{ card: "BT24-092", as: "option" }],
        },
        1: { security: [] },
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

  it("uses the capped Option but declines the optional subsequent attack (Q5673)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "source" },
            { card: "BT24-024", as: "attacker" },
          ],
          hand: [{ card: "BT24-092", as: "option" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { security: [{ card: "BT1-012", as: "security" }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const suspendPrompt = s.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
    const optionPrompt = s.decisions.filter(({ req }) => req.kind === "optional")[1]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 3);
    const linkPrompt = s.decisions.filter(({ req }) => req.kind === "optional")[2]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: linkPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 4);
    const attackPrompt = s.decisions.filter(({ req }) => req.kind === "optional")[3]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackPrompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.perm("attacker").linked.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(false);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.state.memory).toBe(-3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("option").instanceId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
  });

  it("skips both End-of-Turn tails when Security has already suspended this Tamer (Q5672)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "source" },
            { card: "BT24-024", as: "attackerA" },
            { card: "BT24-011", as: "readyB" },
          ],
          hand: [{ card: "BT24-092", as: "option" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          security: [
            { card: "BT8-102", as: "samadhi" },
            { card: "BT1-009", as: "remainingOne" },
            { card: "BT1-010", as: "remainingTwo" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("source").permanentId);
    s.state.memory = 3;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attackerA").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    await settle(() => s.perm("source").isSuspended);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("remainingOne").instanceId,
      s.inst("remainingTwo").instanceId,
    ]);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.perm("readyB").isSuspended).toBe(false);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("readyB"))).toBe(false);
    expect(s.state.memory).toBe(-3);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("remainingOne").instanceId,
      s.inst("remainingTwo").instanceId,
    ]);
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
        1: { security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -3;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("source"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(false);
  });

  it("runs the End of Your Turn effect through the natural turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "source" },
            { card: "BT24-024", as: "attacker" },
          ],
        },
        1: { security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const source = s.perm("source");
    const attacker = s.perm("attacker");
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => observe(s.engine).hasAttackedThisTurn(attacker));
    expect(source.isSuspended).toBe(true);
    expect(observe(s.engine).hasAttackedThisTurn(attacker)).toBe(true);
    await turn;
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-085", as: "source" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("repeats the public End of Your Turn attack after the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-085", as: "source" },
            { card: "BT24-024", as: "attacker" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { security: ["BT1-012", "BT1-012", "BT1-012"], deck: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("attacker")));
    expect(s.perm("source").isSuspended).toBe(true);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => observe(s.engine).hasAttackedThisTurn(s.perm("attacker")));
    expect(s.perm("source").isSuspended).toBe(true);
    await secondTurn;
  });
});
