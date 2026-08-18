import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-070.js";

describe("EX3-070 Avalon's Gate", () => {
  it("matches the official identity and complete Main/Security text", () => {
    const definition = getCardDefinition("EX3-070")!;
    expect(definition).toMatchObject({
      cardId: "EX3-070",
      nameEn: "Avalon's Gate",
      colors: ["Green", "Blue"],
      kinds: ["Option"],
      playCost: 3,
      rarity: "R",
      imageId: "EX3-070",
    });
    expect(definition.effectText).toContain("Activate 1 of the effects below");
    expect(definition.effectText).toContain("[Examon] in its name");
    expect(definition.effectText).toContain("gains ＜Piercing＞ for the turn");
    expect(definition.securityEffectText).toBe(
      "[Security] Suspend 1 of your opponent's Digimon, and unsuspend 1 of your Digimon.",
    );
  });

  it("without Examon, can choose the suspend and Piercing bullet only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-037", as: "piercingTarget" },
          { card: "EX3-038", as: "piercingAlternative" },
        ],
        hand: [{ card: "EX3-070", as: "gate" }],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "suspendTarget" },
          { card: "BT1-011", as: "suspendAlternative" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gate").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const modal = s.decisions.at(-1)!.req;
    expect(modal).toMatchObject({
      sourceCardId: "EX3-070",
      kind: "chooseOption",
      options: {
        choices: ["Suspend 1 target(s) · Gain ＜Piercing＞", "Unsuspend 1 target(s)"],
        timing: "Main",
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: modal.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets" && s.decisions.length >= 2);
    const suspendDecision = s.decisions.at(-1)!.req;
    expect(suspendDecision).toMatchObject({
      sourceCardId: "EX3-070",
      options: {
        candidateInstanceIds: [s.perm("suspendTarget").permanentId, s.perm("suspendAlternative").permanentId],
        min: 1,
        max: 1,
        timing: "Main",
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseTargets" &&
        s.state.pendingDecision.decisionId !== suspendDecision.decisionId &&
        s.decisions.length >= 3,
    );
    const piercingDecision = s.decisions.at(-1)!.req;
    expect(piercingDecision).toMatchObject({
      sourceCardId: "EX3-070",
      options: {
        candidateInstanceIds: [s.perm("piercingTarget").permanentId, s.perm("piercingAlternative").permanentId],
        min: 1,
        max: 1,
        timing: "Main",
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: piercingDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("piercingTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("suspendTarget").isSuspended && observe(s.engine).hasPierce(s.perm("piercingTarget")));

    expect(observe(s.engine).hasPierce(s.perm("piercingTarget"))).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("piercingAlternative"))).toBe(false);
    expect(s.perm("piercingTarget").isSuspended).toBe(false);
    expect(s.perm("suspendAlternative").isSuspended).toBe(false);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("without Examon, can choose the unsuspend bullet only", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-037", suspended: true, as: "unsuspendTarget" }],
          hand: [{ card: "EX3-070", as: "gate" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "untouched" }] },
      },
      { autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gate").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("unsuspendTarget").isSuspended);

    expect(s.perm("untouched").isSuspended).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("unsuspendTarget"))).toBe(false);
    assertNoLoudGap(s);
  });

  it("with Examon, activates both bullets without asking which one", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-074", suspended: true, as: "examon" }],
          hand: [{ card: "EX3-070", as: "gate" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId, s.perm("examon").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gate").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("opponent").isSuspended &&
        !s.perm("examon").isSuspended &&
        observe(s.engine).hasPierce(s.perm("examon")),
    );

    expect(observe(s.engine).hasPierce(s.perm("examon"))).toBe(true);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-070" && req.kind === "chooseOption")).toHaveLength(
      0,
    );
    assertNoLoudGap(s);
  });

  it("Security suspends an opposing Digimon and unsuspends one of yours", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX3-070", faceUp: true, as: "gate" }],
          battleArea: [{ card: "EX3-038", suspended: true, as: "mine" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").permanentId, s.perm("mine").permanentId);
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("gate"));

    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("mine").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("Q3435: Security still suspends when you have no Digimon", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX3-070", faceUp: true, as: "gate" }] },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("gate"));

    expect(s.perm("opponent").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q3435: Security still unsuspends when the opponent has no Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX3-070", faceUp: true, as: "gate" }],
          battleArea: [{ card: "EX3-038", suspended: true, as: "mine" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("gate"));

    expect(s.perm("mine").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });
});
