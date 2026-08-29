import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-102.js";
import "../index.js";

describe("BT24-102 Homeros", () => {
  it("models threshold draw, TS DP aura, Olympos effect activation, and Security play", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        { kind: "GainMemory", amount: 1 },
        { kind: "Suspend", condition: { kind: "memoryAtLeast", value: 5 } },
        { kind: "Draw", amount: 1, condition: { kind: "memoryAtLeast", value: 5 } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, target: { count: "all" } }],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "ActivateForeignEffect",
          zone: "battleArea",
          fromTriggers: ["OnPlay", "WhenDigivolving"],
          count: 1,
          cost: { kind: "suspend" },
          optional: true,
        },
      ],
    });
    expect(compiled.effects[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("suspends and draws after the start-main-phase memory gain crosses five", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT24-102", as: "source" }], deck: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009"));

    expect(s.state.memory).toBe(5);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("runs the start-main-phase threshold through the production turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-102", as: "source" }],
          hand: [{ card: "BT1-009", as: "playable" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(5);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("draws even when it cannot suspend at 5 or more memory (Q6251)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-102", as: "source", suspended: true }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("source"));

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("grants source-bound +1000 DP only to own TS Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT24-102", as: "source" },
          { card: "BT24-009", as: "eligible" },
          { card: "BT1-009", as: "ineligible" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("eligible").currentDP).toBe(s.perm("eligible").baseDP + 1000);
    expect(s.perm("ineligible").currentDP).toBe(s.perm("ineligible").baseDP);

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    expect(s.perm("eligible").currentDP).toBe(s.perm("eligible").baseDP);
  });

  it("suspends to activate an Olympos XII On Play or When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-102", as: "source" },
            { card: "BT24-101", as: "jupitermon" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("runs the end-of-your-turn borrowed effect through the production turn window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-102", as: "source" },
            { card: "BT24-101", as: "jupitermon" },
          ],
          hand: [{ card: "BT1-009", as: "playable" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(2);
    expect(s.perm("source").isSuspended).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("target").instanceId));

    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("does not activate a foreign effect when the suspension cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-102", as: "source", suspended: true },
            { card: "BT24-101", as: "jupitermon" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-080", as: "target", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle();

    expect(s.state.players[1]!.battleArea).toContain(s.perm("target"));
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("Q5721: may activate the On Play route of a combined effect while When Digivolving is disabled", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-102", as: "source" },
            { card: "BT24-040", as: "venusmon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "target", under: ["BT1-009", "BT1-010"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    advance(s.engine).ledgers.continuous.addEffectTimingDisable(
      s.perm("venusmon").permanentId,
      ["whenDigivolving"],
      EffectDuration.UntilOpponentTurnEnd,
    );

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));

    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("Q6029: cannot reactivate a Once Per Turn lender effect whose budget is already spent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-102", as: "source" },
            { card: "BT26-103", as: "wrathMode" },
          ],
          security: ["BT1-001", "BT1-002"],
          deck: ["BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("wrathMode"));
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(2);

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("Q6945: may activate an On Play effect gained through Succession", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-102", as: "source" },
            { card: "BT26-080", as: "bacchusmonX", under: [{ card: "BT25-077", as: "bacchusmon" }] },
          ],
          hand: [{ card: "BT24-009", as: "playTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("playTarget").instanceId,
      ),
    );

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("playTarget").instanceId,
      ),
    ).toBe(true);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT24-102", as: "source" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    );
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(false);
  });

  it("naturally plays itself when revealed by a security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT24-102", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-102"));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("source").topCard.cardId).toBe("BT24-102");
  });
});
