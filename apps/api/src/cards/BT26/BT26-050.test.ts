import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-050.js";
import "../index.js";

describe("BT26-050 Rosemon: Burst Mode", () => {
  it("encodes the independent suspend/lock targets and security cost", () => {
    expect(compiled.digivolutionRequirement).toEqual(
      expect.arrayContaining([
        { level: 6, traits: ["DATA SQUAD"], cost: 5, isAlternate: true },
        {
          cost: 0,
          isAlternate: true,
          names: ["Rosemon"],
          burstDigivolve: { returnTamerNamesExact: ["Yoshino Fujieda"] },
        },
      ]),
    );
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        expect.objectContaining({ kind: "Suspend" }),
        expect.objectContaining({ kind: "Restrict", restriction: "unsuspend" }),
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        expect.objectContaining({ kind: "Return", to: "deckBottom" }),
        expect.objectContaining({ kind: "SecurityManipulation", op: "trashTop" }),
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        expect.objectContaining({ kind: "Return", to: "deckBottom" }),
        expect.objectContaining({ kind: "SecurityManipulation", op: "trashTop" }),
      ],
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [expect.objectContaining({ kind: "WaiveColorRequirement" })],
        }),
        expect.objectContaining({
          trigger: "Main",
          actions: [
            expect.objectContaining({ kind: "Suspend" }),
            expect.objectContaining({ kind: "Restrict", restriction: "digivolve" }),
            expect.objectContaining({ kind: "Restrict", restriction: "unsuspend" }),
          ],
        }),
      ]),
    );
  });

  it("publicly returns a suspended Digimon before trashing the opponent's top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-050", as: "burstMode" },
            { card: "BT26-036", as: "returned", suspended: true },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }],
          security: [{ card: "BT1-010", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("burstMode"));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toContain("BT26-036");
  });

  it("resolves the same return-then-trash sequence from When Attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-050", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "returned", suspended: true }],
          security: [{ card: "BT1-010", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("does not trash security when the optional suspended-Digimon return is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-050", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "returned", suspended: true }],
          security: [{ card: "BT1-010", as: "security" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Q7052/Q7053: may suspend either player's cards and locks independently selected opponents", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-050", as: "burstMode" },
            { card: "BT1-082", as: "ownSuspendTargetOne" },
            { card: "BT1-083", as: "ownSuspendTargetTwo" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "lockTargetOne", suspended: true },
            { card: "BT1-011", as: "lockTargetTwo", suspended: true },
          ],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.perm("ownSuspendTargetOne").permanentId,
      s.perm("ownSuspendTargetTwo").permanentId,
      s.perm("lockTargetOne").permanentId,
      s.perm("lockTargetTwo").permanentId,
    );
    await s.ready();

    const resolving = advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("burstMode"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const suspendDecisionId = s.state.pendingDecision!.decisionId;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendDecisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== suspendDecisionId,
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.perm("ownSuspendTargetOne").isSuspended).toBe(true);
    expect(s.perm("ownSuspendTargetTwo").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("lockTargetOne"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("lockTargetTwo"), "unsuspend")).toBe(true);
  });

  it("Q7055: offers both simultaneous When Digivolving effects for ordering", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-050", as: "burstMode" },
            { card: "BT1-082", as: "returnCost", suspended: true },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );

    const resolving = advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("burstMode"));
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[1]!] },
      }),
    ).toEqual({ ok: true });
    await resolving;
  });

  it("uses the DATA SQUAD Use Requirement and locks every suspended opposing card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-050", as: "option" }],
          battleArea: [{ card: "BT25-021", as: "dataSquad" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "alreadySuspended", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("option").instanceId));

    for (const name of ["first", "second", "alreadySuspended"] as const) {
      expect(s.perm(name).isSuspended).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm(name), "digivolve")).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm(name), "unsuspend")).toBe(true);
    }
  });

  it("Q7054: Burst Digivolve returns Yoshino and trashes the former top card at turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-049", as: "base" },
            { card: "BT26-091", as: "yoshino" },
          ],
          hand: [{ card: "BT26-050", as: "burst" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const priorTop = s.perm("base").topCard.instanceId;
    const yoshino = s.perm("yoshino").topCard.instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT26-050");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(yoshino);
    expect(s.perm("base").burstDigivolvePendingTrash).toBe(true);

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(priorTop);
  });
});
