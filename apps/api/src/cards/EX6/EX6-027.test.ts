import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-027.js";

describe("EX6-027 Ophanimon", () => {
  it("has Blast Digivolve and gates an -8000 DP effect behind trashing security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDigivolve",
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -8000,
      duration: "untilOpponentTurnEnd",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "security" } } },
    });
  });
  it("responds to security removal with attack/recovery effects depending on whose turn it is", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        { kind: "Attack" },
        { kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 } },
      ],
    }));
  it("publicly pays with security and gives an opposing Digimon -8000 DP", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-027", as: "oph" }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const before = s.perm("opponent").currentDP;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("oph").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.perm("opponent").currentDP).toBe(before - 8000);
  });

  it("does not offer the paid effect with no security cards", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-027", as: "oph" }] }, 1: { battleArea: [{ card: "EX6-031", as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("oph"));
    expect(s.perm("opponent").currentDP).toBe(before);
  });

  it("Q3744 publicly plays for its cost with zero security and offers no paid effect", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-027", as: "oph" }] },
        1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    const before = s.perm("opponent").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("oph").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("oph").instanceId),
    );

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("opponent").currentDP).toBe(before);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.decisions).toHaveLength(0);
  });

  it("Blast Digivolves from a public Counter window and resolves the security cost and DP effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-022", as: "ange", suspended: true }],
          hand: [{ card: "EX6-027", as: "oph" }],
          security: [{ card: "BT1-009", as: "paid" }],
          deck: [
            { card: "BT1-010", as: "draw" },
            { card: "BT1-011", as: "recovery" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "EX6-031", as: "target" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();
    const targetBefore = s.perm("target").currentDP;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ange").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("oph").instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const targetChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: targetChoice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("target").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === targetBefore - 8000 && s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("paid").instanceId);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("recovery").instanceId);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
  });

  it("publicly responds to own security removal with Security Attack +1 and an attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-027", as: "oph" }], security: ["BT1-009"] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("oph"), "SecurityAttack")).toBe(1);
    expect(s.perm("oph").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly responds during the opponent's turn with Recovery +1 instead of attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-027", as: "oph" }],
          security: ["BT1-009"],
          deck: [{ card: "BT1-009", as: "recovery" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).verb.trashFromSecurity(0, 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovery").instanceId);
    expect(s.perm("oph").isSuspended).toBe(false);
  });
});
