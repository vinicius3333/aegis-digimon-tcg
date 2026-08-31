import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-042.js";
import "../index.js";

const CARD_ID = "BT26-042";

describe("BT26-042 Okuwamon", () => {
  it("uses exactly the Lv.4 [TS] alternate evolution for cost 3 and rejects a non-TS Lv.4", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 4,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-010", as: "tsBase" }],
        hand: [{ card: CARD_ID, as: "okuwamon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("okuwamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "AD1-001", as: "nonTsLv4" }],
        hand: [{ card: CARD_ID, as: "okuwamon" }],
      },
    });
    illegal.state.memory = 3;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("nonTsLv4").permanentId,
        instanceId: illegal.inst("okuwamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("retains the catalog green Lv.4 evolution route for cost 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-070", as: "greenBase" }],
        hand: [{ card: CARD_ID, as: "okuwamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenBase").permanentId,
        instanceId: s.inst("okuwamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenBase").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.perm("greenBase").topCard.cardId).toBe(CARD_ID);
    expect(s.perm("greenBase").stack.map(({ cardId }) => cardId)).toEqual(["BT1-070"]);
  });

  it("resolves its two simultaneous On Play effects and grants the full long-duration buff", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-066", as: "insectoid" }],
          hand: [{ card: CARD_ID, as: "okuwamon" }],
        },
        1: { battleArea: [{ card: "BT1-085", as: "opponentTamer" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("insectoid").permanentId);
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("okuwamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasPierce(s.perm("insectoid")));
    await settle();

    expect(s.perm("opponentTamer").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "unsuspend")).toBe(true);
    expect(s.perm("insectoid").currentDP).toBe(5000);
    expect(observe(s.engine).hasPierce(s.perm("insectoid"))).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("offers the controller both simultaneous On Play triggers for ordering (Q7033)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "okuwamon" }] },
        1: { battleArea: [{ card: "BT1-085", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: false },
    );
    const resolving = advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("okuwamon"), {
      subjectPermanentId: s.perm("okuwamon").permanentId,
    });
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

  it("locks a different card from the one it suspended (Q7031)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "okuwamon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "suspendTarget" },
          { card: "BT1-085", as: "lockOnly" },
        ],
      },
    });

    const resolving = advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("okuwamon"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    let pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== pending.decisionId);
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("lockOnly").permanentId] },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(s.perm("lockOnly").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("lockOnly"), "unsuspend")).toBe(true);
  });

  it("encodes the Q&A-sensitive target and inherited clauses in IR", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", sharedUseKey: "bt26-042-piercing-dp" });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
        },
      ],
    });
  });

  it("shares the buff OPT between On Play and its own attack while keeping copies independent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "first" },
            { card: CARD_ID, as: "second" },
            { card: "BT1-066", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("first"), {
      subjectPermanentId: s.perm("first").permanentId,
    });
    expect(s.perm("target").currentDP).toBe(5000);

    await advance(s.engine).fireForPermanent(EffectTiming.OnAllyAttack, s.perm("first"), {
      attackerPermanentId: s.perm("first").permanentId,
    });
    expect(s.perm("target").currentDP).toBe(5000);

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("second"), {
      subjectPermanentId: s.perm("second").permanentId,
    });
    expect(s.perm("target").currentDP).toBe(8000);
  });

  it("activates the [When Attacking] buff on its own real attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "attacker" },
            { card: "BT1-066", as: "target" },
          ],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasPierce(s.perm("target")));

    expect(s.perm("target").currentDP).toBe(5000);
    expect(observe(s.engine).hasPierce(s.perm("target"))).toBe(true);
  });

  it("trashes the top security only for a surviving battle winner carrying Okuwamon as inherited (Q7032)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-080", under: [{ card: CARD_ID, as: "inherited" }], as: "host", dp: 10000 }],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }],
        security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-009"],
      },
    });
    const topId = s.inst("topSecurity").instanceId;
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((instance) => instance.instanceId === topId)).toBe(true);

    expect(compiled.effects?.[4]).toMatchObject({ isInherited: true, frequency: "OncePerTurn" });
  });

  it("does not trash security when the inherited host is deleted in the same battle (Q7032)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-080", under: [CARD_ID], as: "host", dp: 5000 }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 5000 }],
        security: [{ card: "BT1-009", as: "topSecurity" }],
      },
    });
    const hostId = s.perm("host").permanentId;
    const victimId = s.perm("victim").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not trash security when a different Digimon wins the battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-081", under: [CARD_ID], as: "host" },
          { card: "BT1-080", as: "ally" },
        ],
      },
      1: { security: [{ card: "BT1-009", as: "topSecurity" }] },
    });
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("ally").permanentId,
    });

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
