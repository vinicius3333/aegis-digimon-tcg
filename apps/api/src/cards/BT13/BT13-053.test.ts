import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT13-053.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT21/BT21-052.js";
import "../BT1/BT1-080.js";
import "../BT1/BT1-083.js";
import "../BT9/BT9-055.js";
import "./BT13-059.js";

describe("BT13-053 Mihiramon", () => {
  it("suspends a target and prevents unsuspension without undoing the suspension", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } }, count: 1 },
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          actions: [{ mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("suspends an eligible opponent Digimon and keeps it suspended", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT13-053", as: "mihira" }] }, 1: { battleArea: [{ card: "BT1-015", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihira").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended, 3000);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("publicly suspends a low-DP Digimon and separately locks a high-DP Digimon (Q2295-Q2297)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-053", as: "mihira" }], deck: ["BT1-010", "BT1-010"] },
        1: {
          battleArea: [
            { card: "BT13-053", as: "low" },
            { card: "BT13-111", as: "high" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mihira").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const secondPending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondPending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("high").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(3);
    expect(s.perm("low").isSuspended).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("low"), "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("high"), "unsuspend")).toBe(true);
  });

  it("reduces its host once per own turn across legal alternate and normal evolutions", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-083", as: "host", under: [{ card: "BT13-053", as: "source" }] },
          { card: "BT1-080", as: "other" },
        ],
        hand: [
          { card: "BT9-055", as: "grandis" },
          { card: "BT13-059", as: "examon" },
          { card: "BT21-052", as: "examonX" },
          { card: "BT13-059", as: "other-examon" },
        ],
        deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
      },
      1: { deck: ["BT1-010", "BT1-010", "BT1-010"] },
    });
    await s.ready();
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("grandis").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT9-055");
    await settle();
    expect(s.state.memory).toBe(10);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT13-059");
    expect(s.state.memory).toBe(6);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("other").permanentId,
        instanceId: s.inst("other-examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("other").topCard.cardId === "BT13-059");
    expect(s.state.memory).toBe(2);

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
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("examonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT21-052");
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("normally digivolves from a green level 4 for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-051", as: "base" }], hand: [{ card: "BT13-053", as: "mihira" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mihira").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-053");
    expect(s.state.memory).toBe(1);
  });
});
