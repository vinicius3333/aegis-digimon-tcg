import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-018.js";

function mainEffectKey(s: EngineSetup): string {
  const source = (s.engine as any).cardSourceOf(s.inst("garurumon"));
  return effectsOf(EffectTiming.OnDeclaration, source).find((effect) => effect.effectKey.startsWith("BT23-018/"))!
    .effectKey;
}

describe("BT23-018 Garurumon", () => {
  it("matches every catalog field and carries every printed clause in IR", () => {
    expect(getCardDefinition("BT23-018")).toMatchObject({
      cardId: "BT23-018",
      nameEn: "Garurumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 2 },
        { color: "Red", level: 3, memoryCost: 2 },
      ],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beast", "CS"],
      inheritedEffectText: "[Opponent's Turn] This Digimon gets +2000 DP.",
    });
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Jamming", raw: "＜Jamming＞" }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OpponentsTurn",
          isInherited: true,
          actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
        }),
      ]),
    );
  });

  it("once per turn pays the restack cost before playing Agumon or Nokia for two less", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: {
        filter: {
          controller: "mine",
          nameOrTrait: [{ tokens: ["Agumon", "Nokia Shiramine"], match: "nameExact" }],
        },
        count: 1,
        upTo: true,
      },
      from: ["hand"],
      payCost: true,
      reduceCostBy: 2,
      cost: {
        kind: "place",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        raw: "By placing this Digimon's top stacked card as its bottom digivolution card",
      },
      optional: false,
      abortOnDecline: true,
    });
  });

  it("pays the restack cost, then plays Agumon for exactly 2 less, per Q5236", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "garurumon", under: ["BT23-001", "BT23-017"] }],
          hand: [{ card: "BT1-010", as: "agumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const garurumonId = s.inst("garurumon").instanceId;
    const exposedId = s.perm("garurumon").stack.at(-1)!.instanceId;

    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: garurumonId, effectKey: mainEffectKey(s) }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("agumon").instanceId),
    );

    expect(s.state.memory).toBe(4);
    expect(s.perm("garurumon").topCard.instanceId).toBe(exposedId);
    expect(s.perm("garurumon").stack[0]!.instanceId).toBe(garurumonId);
  });

  it("cannot declare without a digivolution card, per Q5237", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-018", as: "garurumon" }], hand: ["BT1-010"] } });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("garurumon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toMatchObject({ ok: false });
  });

  it("still pays and restacks when the optional reduced play is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "garurumon", under: ["BT23-001", "BT23-017"] }],
          hand: [{ card: "BT22-084", as: "nokia" }],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 5;
    const before = [
      s.perm("garurumon").topCard.instanceId,
      ...s.perm("garurumon").stack.map((card) => card.instanceId),
    ];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("garurumon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const playPrompt = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playPrompt.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect([
      s.perm("garurumon").topCard.instanceId,
      ...s.perm("garurumon").stack.map((card) => card.instanceId),
    ]).not.toEqual(before);
    expect(s.perm("garurumon").stack[0]!.instanceId).toBe(s.inst("garurumon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nokia").instanceId);
    expect(s.state.memory).toBe(5);
  });

  it("offers exact Agumon while excluding Agumon X Antibody", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "garurumon", under: ["BT23-001"] }],
          hand: [
            { card: "BT1-010", as: "agumon" },
            { card: "BT9-008", as: "xAgumon" },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("garurumon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const playPrompt = s.decisions.find(({ req }) => req.kind === "selectCards")!;
    expect(playPrompt.req.options?.candidateInstanceIds).toContain(s.inst("agumon").instanceId);
    expect(playPrompt.req.options?.candidateInstanceIds).not.toContain(s.inst("xAgumon").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playPrompt.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("agumon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("agumon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("agumon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("xAgumon").instanceId);
  });

  it("keeps Jamming Garurumon after a larger security battle but loses in an ordinary larger battle", async () => {
    const securityBattle = setupEngine({
      0: { battleArea: [{ card: "BT23-018", as: "garurumon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      1: { security: ["BT1-021"], deck: ["BT1-012", "BT1-013", "BT1-014"] },
    });
    expect(
      securityBattle.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: securityBattle.perm("garurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => securityBattle.state.players[1]!.security.length === 0 && !observe(securityBattle.engine).isAttacking(),
    );
    expect(securityBattle.state.players[1]!.security).toHaveLength(0);
    expect(securityBattle.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-018")).toBe(true);
    expect(securityBattle.state.players[0]!.trash.some((card) => card.cardId === "BT23-018")).toBe(false);

    const ordinaryBattle = setupEngine({
      0: { battleArea: [{ card: "BT23-018", as: "garurumon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      1: { battleArea: [{ card: "BT1-021", as: "larger", suspended: true }], deck: ["BT1-012", "BT1-013", "BT1-014"] },
    });
    const targetId = ordinaryBattle.perm("larger").permanentId;
    expect(
      ordinaryBattle.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: ordinaryBattle.perm("garurumon").permanentId,
        target: { kind: "permanent", permanentId: targetId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !ordinaryBattle.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-018"));
    expect(ordinaryBattle.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT23-018")).toBe(false);
    expect(ordinaryBattle.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(true);
  });

  it("publicly evolves from exact off-color Gabumon and CS, while rejecting wrong level and trait", async () => {
    const exact = setupEngine({
      0: {
        battleArea: [{ card: "ST16-03", as: "gabumon" }],
        hand: [{ card: "BT23-018", as: "garurumon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    exact.state.memory = 5;
    const exactSource = exact.inst("gabumon").instanceId;
    const exactTop = exact.inst("garurumon").instanceId;
    const exactHandBefore = exact.state.players[0]!.hand.length;
    expect(
      exact.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: exact.perm("gabumon").permanentId,
        instanceId: exactTop,
      }),
    ).toEqual({ ok: true });
    await settle(() => exact.perm("gabumon").topCard.instanceId === exactTop);
    expect(exact.perm("gabumon").stack[0]!.instanceId).toBe(exactSource);
    expect(exact.state.memory).toBe(3);
    expect(exact.state.players[0]!.hand.length).toBe(exactHandBefore);

    const cs = setupEngine({
      0: {
        battleArea: [{ card: "BT23-037", as: "csSource" }],
        hand: [{ card: "BT23-018", as: "garurumon" }],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    cs.state.memory = 5;
    const csSource = cs.inst("csSource").instanceId;
    const csTop = cs.inst("garurumon").instanceId;
    const csHandBefore = cs.state.players[0]!.hand.length;
    expect(
      cs.engine.applyIntent(0, { type: "digivolve", permanentId: cs.perm("csSource").permanentId, instanceId: csTop }),
    ).toEqual({ ok: true });
    await settle(() => cs.perm("csSource").topCard.instanceId === csTop);
    expect(cs.perm("csSource").stack[0]!.instanceId).toBe(csSource);
    expect(cs.state.memory).toBe(3);
    expect(cs.state.players[0]!.hand.length).toBe(csHandBefore);

    const wrongLevel = setupEngine({
      0: { battleArea: [{ card: "BT23-020", as: "level4" }], hand: [{ card: "BT23-018", as: "candidate" }] },
    });
    wrongLevel.state.memory = 5;
    const wrongLevelHand = wrongLevel.state.players[0]!.hand.length;
    expect(
      wrongLevel.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongLevel.perm("level4").permanentId,
        instanceId: wrongLevel.inst("candidate").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(wrongLevel.state.players[0]!.hand.length).toBe(wrongLevelHand);
    expect(wrongLevel.state.memory).toBe(5);
    expect(wrongLevel.perm("level4").topCard.cardId).toBe("BT23-020");

    const wrongTrait = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "nonCS" }], hand: [{ card: "BT23-018", as: "candidate" }] },
    });
    wrongTrait.state.memory = 5;
    const wrongTraitHand = wrongTrait.state.players[0]!.hand.length;
    expect(
      wrongTrait.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: wrongTrait.perm("nonCS").permanentId,
        instanceId: wrongTrait.inst("candidate").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(wrongTrait.state.players[0]!.hand.length).toBe(wrongTraitHand);
    expect(wrongTrait.state.memory).toBe(5);
    expect(wrongTrait.perm("nonCS").topCard.cardId).toBe("BT1-064");
  });

  it("grants inherited +2000 DP only during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-023", as: "host", under: ["BT23-018"] }] } });
    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(getCardDefinition("BT23-023")!.dp);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(getCardDefinition("BT23-023")!.dp! + 2000);
  });
});
