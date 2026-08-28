import {
  compiledEffects,
  EffectTiming,
  dnaDigivolutionRequirementsFor,
  digivolutionRequirementsFor,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-037";

describe("EX12-037 Omnimon", () => {
  it("maps the evolution routes, keywords, shared timing, deletion, and stack scaling", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "Omnimon",
      colors: ["Blue", "Yellow", "Red"],
      playCost: 15,
      dp: 15000,
      level: 7,
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Warrior", "Royal Knight", "ME", "VB"],
      evoCosts: [
        { color: "Blue", level: 6, memoryCost: 5 },
        { color: "Yellow", level: 6, memoryCost: 5 },
        { color: "Red", level: 6, memoryCost: 5 },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(digivolutionRequirementsFor(cardId)).toEqual([
      { level: 6, traits: ["ME", "VB"], cost: 5, isAlternate: true },
    ]);
    expect(dnaDigivolutionRequirementsFor(cardId)).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 6 },
          { color: "Red", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 6 },
          { color: "Black", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 6 },
          { color: "Red", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 6 },
          { color: "Black", level: 6 },
        ],
      },
    ]);
    expect(compiled.effects.filter((effect) => effect.trigger === "Static")).toEqual([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      { trigger: "Static", actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
    ]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
          {
            kind: "Modal",
            choose: 0,
            chooseScaling: { per: 5, filter: {}, unit: "digivolutionCards" },
            options: [
              [{ kind: "ModifyDP", amount: -13000, duration: "untilOpponentTurnEnd" }],
              [
                { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 },
                { kind: "SecurityManipulation", op: "addTop", controller: "mine", from: ["deck"], amount: 1 },
              ],
            ],
          },
        ],
      });
    }
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("deletes one opponent and applies one scaled DP option for five stack cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-037", as: "source", under: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"] },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim", dp: 3000 },
            { card: "BT1-011", as: "debuffed", dp: 15000 },
          ],
        },
      },
      { autoChooseOption: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").topCard!.instanceId);
    const victimId = s.perm("victim").permanentId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => false, 100);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.perm("debuffed").currentDP).toBe(2000);
  });

  it("trashes security and recovers when the second option is chosen", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-037", as: "source", under: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"] },
          ],
          deck: ["BT1-014"],
          security: ["BT1-015"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 3000 }], security: ["BT1-016", "BT1-017"] },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").topCard!.instanceId);
    const victimId = s.perm("victim").permanentId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => false, 100);

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("activates the same scaled option twice with ten sources (Q6795)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source", under: Array(10).fill("BT1-009") }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: "BT1-011", as: "debuffed", dp: 30_000 },
          ],
        },
      },
      { autoChooseOption: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").topCard.instanceId, s.perm("debuffed").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("debuffed").permanentId),
    ).toBe(true);
    expect(s.perm("debuffed").currentDP).toBe(4000);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseOption")).toHaveLength(2);
  });

  it("chooses the next scaled effect only after the previous resolves and delays the DP-0 rule check (Q6796/Q6798)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: Array(10).fill("BT1-009") }],
          deck: ["BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: "BT1-011", as: "zeroDp", dp: 12_000 },
          ],
          security: ["BT1-016", "BT1-017"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").topCard.instanceId, s.perm("zeroDp").topCard.instanceId);
    await s.ready();
    const zeroDpId = s.perm("zeroDp").permanentId;

    const resolving = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "chooseOption");
    const firstChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstChoice.decisionId,
        response: { kind: "chooseOption", optionIndex: 0 },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision?.kind === "chooseOption" &&
        s.state.pendingDecision.decisionId !== firstChoice.decisionId,
    );
    expect(s.perm("zeroDp").currentDP).toBe(0);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === zeroDpId)).toBe(true);
    const secondChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondChoice.decisionId,
        response: { kind: "chooseOption", optionIndex: 1 },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === zeroDpId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("skips source-count scaling if the delete clause's immediate reaction removes Omnimon (Q7191)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source", under: Array(5).fill("BT1-009") }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: "BT1-011", as: "unmodified", dp: 15_000 },
          ],
        },
      },
      { autoChooseOption: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    const victimId = s.perm("victim").permanentId;
    preferred.push(s.perm("victim").topCard.instanceId, s.perm("unmodified").topCard.instanceId);
    advance(s.engine).ledgers.subTriggers.subscribeReplacement({
      event: "wouldLeavePlay",
      mode: "instead",
      sourcePermanentId: victimId,
      appliesTo: (_ctx, leavingId) => leavingId === victimId,
      apply: async (ctx) => {
        await ctx.fx.deletePermanent([sourceId], "byEffect");
      },
      description: "Q7191 immediate reaction removes the resolving Omnimon",
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sourceId)).toBe(false);
    expect(s.perm("unmodified").currentDP).toBe(15_000);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseOption")).toHaveLength(0);
  });

  it("uses all normal and alternate evolution routes and all four DNA pairs", async () => {
    for (const [baseCardId, useAlternateCost] of [
      ["EX12-035", false],
      ["EX12-036", false],
      ["EX12-017", false],
      ["P-240", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = 5;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }

    for (const [firstCardId, secondCardId] of [
      ["EX12-035", "EX12-017"],
      ["EX12-035", "EX12-034"],
      ["EX12-036", "EX12-017"],
      ["EX12-036", "EX12-034"],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: firstCardId, as: "first" },
            { card: secondCardId, as: "second" },
          ],
          hand: [{ card: cardId, as: "source" }],
        },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          materialPermanentIds: [s.perm("first").permanentId, s.perm("second").permanentId],
          instanceId: s.inst("source").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: {
        battleArea: [
          { card: "EX12-035", as: "first" },
          { card: "EX12-036", as: "second" },
        ],
        hand: [{ card: cardId, as: "source" }],
      },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [invalid.perm("first").permanentId, invalid.perm("second").permanentId],
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
