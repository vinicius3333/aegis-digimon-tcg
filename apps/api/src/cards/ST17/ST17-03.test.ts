import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-03 Lopmon", () => {
  it("gives one of your Digimon Alliance for the turn from its Main effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-03", as: "lopmon" },
            { card: "AD1-001", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.perm("lopmon").activatableEffectsJson) as Array<{ effectKey: string }>;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lopmon").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("lopmon").permanentId, "Alliance"));

    expect(observe(s.engine).hasKeyword(s.perm("lopmon").permanentId, "Alliance")).toBe(true);
  });

  it("applies its inherited +1000 DP bonus to a suspended host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-04", as: "host", suspended: true, under: ["ST17-03"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(4000);
  });

  it("accepts the public Kokomon alternate evolution for 0 memory and preserves the stack", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX4-002", as: "base" }, hand: [{ card: "ST17-03", as: "lopmon" }] },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lopmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "ST17-03");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX4-002"]);

    const invalid = setupEngine({
      0: { breeding: { card: "BT1-001", as: "wrongBase" }, hand: [{ card: "ST17-03", as: "lopmon" }] },
    });
    invalid.state.memory = 0;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("wrongBase").permanentId,
        instanceId: invalid.inst("lopmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
  });

  it("rejects a second Main activation in one turn and grants Alliance again on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-03", as: "lopmon" },
            { card: "AD1-001", as: "target" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { hand: [{ card: "BT1-009" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const firstKey = (JSON.parse(s.perm("lopmon").activatableEffectsJson) as Array<{ effectKey: string }>)[0]!
      .effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lopmon").topCard.instanceId,
        effectKey: firstKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target").permanentId, "Alliance"));
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lopmon").topCard.instanceId,
        effectKey: firstKey,
      }),
    ).toMatchObject({ ok: false });
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 0;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const nextKey = (JSON.parse(s.perm("lopmon").activatableEffectsJson) as Array<{ effectKey: string }>)[0]!.effectKey;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lopmon").topCard.instanceId,
        effectKey: nextKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target").permanentId, "Alliance"));
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("uses Alliance in a real attack by suspending an eligible ally and adding its DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-03", as: "lopmon" },
            { card: "ST1-10", as: "ally" },
          ],
        },
        1: { security: ["ST1-09", "ST1-09"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.perm("lopmon").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lopmon").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("lopmon").permanentId, "Alliance"));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lopmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.events.find((event) => event.kind === "alliancePrompt")).toMatchObject({
      permanentId: s.perm("lopmon").permanentId,
    });
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.events.some((event) => event.kind === "allianceResolved")).toBe(true);
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 0);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.perm("lopmon").topCard?.cardId).toBe("ST17-03");
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("lopmon").permanentId),
    ).toBe(true);
  });

  it("Q825: grants Alliance to printed Alliance, then permits two distinct Alliance suspensions", async () => {
    let setup!: ReturnType<typeof setupEngine>;
    let allianceDpDuringAttack: number | undefined;
    setup = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-03", as: "lopmon" },
            { card: "ST17-09", as: "attacker", dp: 10000 },
            { card: "BT1-009", as: "allyA", dp: 3000 },
            { card: "BT1-010", as: "allyB", dp: 5000 },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-062", as: "blocker" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: false,
        onEvent: (event) => {
          if (event.kind === "securityChecked" && allianceDpDuringAttack === undefined) {
            allianceDpDuringAttack = setup.perm("attacker").currentDP;
          }
        },
      },
    );
    const s = setup;
    s.state.memory = 10;
    await s.ready();

    const effects = JSON.parse(s.perm("lopmon").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("lopmon").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("attacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("attacker").permanentId, "Alliance"));

    const baseDP = s.perm("attacker").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "alliancePrompt").length >= 1);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("allyA").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.filter((event) => event.kind === "alliancePrompt").length >= 2);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("allyB").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.filter((event) => event.kind === "allianceResolved").length === 2);
    expect(allianceDpDuringAttack).toBe(baseDP + 3000 + 5000);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("allyA").isSuspended).toBe(true);
    expect(s.perm("allyB").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(baseDP);
    expect(s.events.filter((event) => event.kind === "allianceResolved")).toHaveLength(2);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
