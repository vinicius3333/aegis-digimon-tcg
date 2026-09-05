import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-074.js";
import "../BT8/BT8-071.js";
import "./EX8-073.js";

describe("EX8-074", () => {
  it("reduces its play cost by 4 by suspending 2 Digimon and has Alliance and Vortex", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      actions: [{ mode: "reduceCost", amount: 4, cost: { kind: "suspend", target: { count: 2 } } }],
    });
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "Alliance", raw: "＜Alliance＞" },
        { keyword: "Vortex", raw: "＜Vortex＞" },
      ]),
    );
  });
  it("suspends a Digimon, deletes an opposing Digimon up to 8000 DP, and reactivates its own effect once per turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "Suspend", optional: true });
    expect(actions[1]).toMatchObject({
      kind: "CostModifier",
      mode: "raiseCeiling",
      costType: "dpDeletion",
      amount: 3000,
      scaling: {
        per: 1,
        unit: "cards",
        filter: { controllerDefault: "both", excludeSelf: true, suspended: true, kind: ["Digimon"] },
      },
    });
    expect(actions[2]).toMatchObject({
      kind: "Delete",
      optional: true,
      target: { filter: { controller: "opponent", dp: { op: "lte", value: 8000 } } },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controllerDefault: "both", kind: ["Digimon"] },
      actions: [
        {
          kind: "ActivateEffect",
          effectType: "WhenDigivolving",
          optional: true,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });

  it("exposes Alliance and Vortex on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-074", as: "medieval" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("medieval"), "Alliance")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("medieval"), "Vortex")).toBe(true);
  });

  it("plays for 4 less by suspending two Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-047", as: "first" },
            { card: "EX8-048", as: "second" },
          ],
          hand: [{ card: "EX8-074", as: "medieval" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("medieval").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-074"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX8-074")).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
  });

  it("cannot obtain the reduction with only one suspendable Digimon at memory zero (Q3986)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-047", as: "only" }],
          hand: [{ card: "EX8-074", as: "medieval" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("medieval").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("medieval").instanceId)).toBe(true);
    expect(s.perm("only").isSuspended).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not partially suspend when the second Digimon is immune (Q6721)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-057", as: "plain" }],
          hand: [{ card: "EX8-074", as: "medieval" }],
        },
        1: { battleArea: [{ card: "EX8-073", as: "immune" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const medievalId = s.inst("medieval").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: medievalId })).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === medievalId)).toBe(true);
    expect(s.perm("plain").isSuspended).toBe(false);
    expect(s.perm("immune").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([0, 1])("pays the original cost under Psychemon at memory %i (Q4442/Q4443)", async (memory) => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX8-074", as: "medieval" }] },
        1: {
          battleArea: [
            { card: "BT8-071", as: "psychemon" },
            { card: "BT2-057", as: "other" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = memory;
    await s.ready();
    const medievalId = s.inst("medieval").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: medievalId })).toEqual({ ok: true });
    const optionalKinds: Array<string | undefined> = [];
    const replies: unknown[] = [];
    if (memory === 1) {
      await settle(() => s.state.pendingDecision?.kind === "optional");
      optionalKinds.push(s.state.pendingDecision?.kind);
      replies.push(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: true },
        }),
      );
      await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === medievalId));
      // Decline the subsequent self-play reaction so the payment targets remain observable.
      await settle(() => s.state.pendingDecision?.kind === "optional");
      optionalKinds.push(s.state.pendingDecision?.kind);
      replies.push(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept: false },
        }),
      );
    }
    await settle();
    expect(optionalKinds).toEqual(memory === 1 ? ["optional", "optional"] : []);
    expect(replies).toEqual(memory === 1 ? [{ ok: true }, { ok: true }] : []);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === medievalId)).toBe(memory === 1);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === medievalId)).toBe(memory === 0);
    expect(s.state.memory).toBe(memory === 1 ? -10 : 0);
    expect(s.perm("psychemon").isSuspended).toBe(memory === 1);
    expect(s.perm("other").isSuspended).toBe(memory === 1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reactivates its When Digivolving effect only once when Digimon are played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-074", as: "medieval" }],
          hand: [
            { card: "EX8-047", as: "first-play" },
            { card: "EX8-048", as: "second-play" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first-target", dp: 8000 },
            { card: "BT1-011", as: "second-target", dp: 8000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("first-play").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("second-play").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("reactivates when the opponent plays a Digimon on their turn (Q3988)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-074", as: "medieval" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 8000 }],
          hand: [{ card: "BT2-057", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    const targetId = s.inst("target").instanceId;
    const playedId = s.inst("played").instanceId;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: playedId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === playedId)).toBe(true);
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("raises the deletion ceiling through a real digivolution for each other suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-024", as: "base" },
            { card: "AD1-001", as: "first-suspended", suspended: true },
            { card: "BT1-010", as: "second-suspended", suspended: true },
          ],
          hand: [{ card: "EX8-074", as: "medieval" }],
          deck: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "AD1-001", as: "14000-dp-target", dp: 14000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("medieval").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "AD1-001")).toBe(true);
    expect(s.perm("base").topCard.cardId).toBe("EX8-074");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-024"]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
