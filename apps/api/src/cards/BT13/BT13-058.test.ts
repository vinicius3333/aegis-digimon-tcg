import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-058.js";
import "./BT13-056.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

describe("BT13-058 Leopardmon: Leopard Mode", () => {
  it("restricts opponent unsuspension, charges suspension for attack, and trashes its top card at turn end", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true }, count: 1 },
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
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: {
            kind: "suspend",
            target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
          },
        },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "Trash", target: { filter: { isSelfRef: true }, count: 1, isSelf: true, topCardOnly: true } },
        { kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" } },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Leopardmon"], cost: 1, isAlternate: true }]);
  });

  it("loads the compiled Leopardmon: Leopard Mode implementation", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-058", as: "leopard" }] } });
    await s.ready();
    expect(s.perm("leopard").topCard?.cardId).toBe("BT13-058");
  });

  it("rejects the alternate path from Leopardmon (X Antibody), whose name only extends Leopardmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-043", as: "nearLeopard" }],
        hand: [{ card: "BT13-058", as: "leopardMode" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nearLeopard").permanentId,
        instanceId: s.inst("leopardMode").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("nearLeopard").topCard?.cardId).toBe("EX5-043");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("leopardMode").instanceId)).toBe(true);
  });

  it("suspends one opponent and independently locks a second opponent Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-056", as: "leopardMode" }],
        hand: [{ card: "BT13-058", as: "mode" }],
        deck: [{ card: "BT1-010", as: "bonus" }],
      },
      1: {
        battleArea: [
          { card: "BT1-015", as: "suspendTarget" },
          { card: "BT1-015", as: "lockTarget", suspended: true },
        ],
      },
    });
    await s.ready();

    s.state.memory = 10;
    const baseId = s.perm("leopardMode").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("leopardMode").permanentId,
        instanceId: s.inst("mode").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const lockDecision = s.state.pendingDecision!;
    expect(JSON.parse(lockDecision.payloadJson).candidateInstanceIds).toContain(s.perm("lockTarget").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: lockDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("lockTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("lockTarget"), "unsuspend"));
    await settle();
    expect(s.state.memory).toBe(9);
    expect(s.perm("leopardMode").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonus").instanceId]);

    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(s.perm("lockTarget").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("lockTarget"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspendTarget"), "unsuspend")).toBe(false);
  });

  it("pays the optional other-Digimon suspension cost and unsuspends itself when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-058", as: "leopardMode", under: ["BT13-056"] },
            { card: "BT1-015", as: "costDigimon" },
          ],
        },
        1: { security: [{ card: "BT1-010", as: "checked" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("leopardMode").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("checked").instanceId);

    expect(s.perm("leopardMode").isSuspended).toBe(false);
    expect(s.perm("costDigimon").isSuspended).toBe(true);
  });

  it("trashes its top card and unsuspends all own Digimon at the end of its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-058", as: "leopardMode", suspended: true, under: ["BT13-056"] },
          { card: "BT1-015", as: "ally", suspended: true },
        ],
        deck: ["BT1-010", "BT1-010"],
      },
      1: { security: ["BT1-010", "BT1-010"] },
    });
    const topId = s.perm("leopardMode").topCard!.instanceId;
    await s.ready();

    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("ally").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === topId)).toBe(true);
    expect(s.perm("leopardMode").topCard?.cardId).toBe("BT13-056");
    expect(s.perm("leopardMode").isSuspended).toBe(false);
    expect(s.perm("ally").isSuspended).toBe(false);
  });
});
