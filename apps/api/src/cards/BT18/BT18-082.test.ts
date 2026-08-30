import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-082.js";
import "./BT18-019.js";

describe("BT18-082 Lucemon: Chaos Mode", () => {
  it("covers opponent target choice, recovery fallback, and once-per-turn replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent" },
            count: 1,
            upTo: true,
            chooser: "opponent",
          },
        },
        { kind: "SecurityManipulation", op: "addTop", condition: { kind: "ifThisEffectDidNotDelete" } },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
      ],
    });
    const onPlayDelete = compiled.effects[0]!.actions[0]!;
    expect(onPlayDelete).not.toHaveProperty("optional");
    expect(onPlayDelete).not.toHaveProperty("controller");
    expect(compiled.effects[1]).toMatchObject({ trigger: "WhenDigivolving" });
    const whenDigivolvingDelete = compiled.effects[1]!.actions[0]!;
    expect(whenDigivolvingDelete).toMatchObject({
      kind: "Delete",
      target: { count: 1, upTo: true, chooser: "opponent" },
    });
    expect(whenDigivolvingDelete).not.toHaveProperty("optional");
    expect(whenDigivolvingDelete).not.toHaveProperty("controller");
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay" }],
    });
  });

  it("naturally lets only the opponent decline deletion before resolving the fallback", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT18-082", as: "chaos" }], deck: ["BT1-001"], security: ["BT1-002"] },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-003"] },
    });
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const pending = s.state.pendingDecision!;
    expect(pending.seat).toBe(1);
    expect(s.decisions.at(-1)!.seat).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toEqual({ ok: false, reason: "decision-pending" });
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2 && s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-001")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-003")).toBe(true);
  });

  it("naturally resolves only the opponent deletion branch when that choice deletes a permanent", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT18-082", as: "chaos" }], deck: ["BT1-001"], security: ["BT1-002"] },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-003"] },
    });
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chaos").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const pending = s.state.pendingDecision!;
    expect(pending.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("victim").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-003")).toBe(false);
  });

  it("naturally resolves the When Digivolving fallback from Lucemon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-034", as: "lucemon" }],
        hand: [{ card: "BT18-082", as: "chaos" }],
        // Digivolution draws the first card; the fallback Recovery card is next.
        deck: ["BT1-003", "BT1-001"],
        security: ["BT1-002"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-003"] },
    });
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lucemon").permanentId,
        instanceId: s.inst("chaos").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const pending = s.state.pendingDecision!;
    expect(pending.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lucemon").topCard?.cardId === "BT18-082");

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-003")).toBe(true);
  });

  it("rejects a Lucemon variant as the exact alternate evolution route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-086", as: "larva" }],
        hand: [{ card: "BT18-082", as: "chaos" }],
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("larva").permanentId,
        instanceId: s.inst("chaos").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("larva").topCard?.cardId).toBe("BT18-086");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("chaos").instanceId)).toBe(true);
  });

  it("naturally trashes its owner's bottom security to prevent leaving play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-082", as: "chaos" }], security: ["BT1-001", "BT1-002"] },
        1: { hand: [{ card: "BT18-019", as: "millenniummon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 14;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("millenniummon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.perm("chaos")).toBeDefined();
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
  });
});
