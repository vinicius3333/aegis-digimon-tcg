import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-058.js";
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
        { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
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
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Leopardmon"], cost: 1, isAlternate: true },
    ]);
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
      0: { battleArea: [{ card: "BT13-058", as: "leopardMode" }] },
      1: {
        battleArea: [
          { card: "BT1-015", as: "suspendTarget" },
          { card: "BT1-015", as: "lockTarget" },
        ],
      },
    });
    await s.ready();

    const resolving = advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("leopardMode"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const firstDecision = s.state.pendingDecision!;
    expect(firstDecision.options?.candidateInstanceIds).toContain(s.perm("suspendTarget").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.state.pendingDecision.decisionId !== firstDecision.decisionId,
    );
    const secondDecision = s.state.pendingDecision!;
    expect(secondDecision.options?.candidateInstanceIds).toContain(s.perm("lockTarget").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("lockTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(s.perm("lockTarget").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("lockTarget"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("suspendTarget"), "unsuspend")).toBe(false);
  });

  it("pays the optional other-Digimon suspension cost and unsuspends itself when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-058", as: "leopardMode", suspended: true },
            { card: "BT1-015", as: "costDigimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenAttacking, s.perm("leopardMode"));

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
      },
    });
    const topId = s.perm("leopardMode").topCard!.instanceId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("leopardMode"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === topId)).toBe(true);
    expect(s.perm("leopardMode").topCard?.cardId).toBe("BT13-056");
    expect(s.perm("leopardMode").isSuspended).toBe(false);
    expect(s.perm("ally").isSuspended).toBe(false);
  });
});
