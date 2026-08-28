import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-043";

function mainEffectKey(s: ReturnType<typeof setupEngine>, alias = "source"): string {
  const source = (s.engine as unknown as { cardSourceOf(instance: unknown): unknown }).cardSourceOf(
    s.perm(alias).topCard!,
  ) as never;
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
    entry.effectKey.startsWith(`${cardId}/`),
  );
  if (effect === undefined) throw new Error(`${cardId} did not surface its Main effect`);
  return effect.effectKey;
}

describe("EX12-043 Hakubamon", () => {
  it("matches the catalog, paid modal, evolution route, and inherited Barrier", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;

    expect(card).toMatchObject({
      nameEn: "Hakubamon",
      colors: ["Yellow"],
      playCost: 5,
      dp: 6000,
      level: 4,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "Shambala", "SW"],
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Shambala"], cost: 2, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
                target: { filter: { kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["SW"], match: "trait" }] } },
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                allowMultiColor: true,
                optional: true,
                filter: { kind: ["Option"], nameOrTrait: [{ tokens: ["SW"], match: "trait" }] },
              },
            ],
          ],
        },
      ],
    });
    expect(compiled.effects.find(({ isInherited }) => isInherited)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    });
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("plays a matching SW Digimon with its cost reduced by two", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX12-039", as: "target" }] } },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("target").instanceId),
    );

    expect(s.state.memory).toBe(0);
  });

  it("uses a matching SW Option with the same reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [
            { card: "EX12-071", as: "option" },
            { card: "EX12-006", as: "payment" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX12-071"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("payment").instanceId)).toBe(true);
  });

  it("enforces Once Per Turn for one source", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "source" }], hand: ["EX12-039", "EX12-039"] } },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const effectKey = mainEffectKey(s);

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => false, 300);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("does not combine reductions from two copies into one play (Q6805)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "first" },
            { card: cardId, as: "second" },
          ],
          hand: [
            { card: cardId, as: "firstTarget" },
            { card: cardId, as: "secondTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    for (const [sourceAlias, targetAlias, expectedMemory] of [
      ["first", "firstTarget", 3],
      ["second", "secondTarget", 0],
    ] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.perm(sourceAlias).topCard.instanceId,
          effectKey: mainEffectKey(s, sourceAlias),
        }),
      ).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst(targetAlias).instanceId),
      );
      expect(s.state.memory).toBe(expectedMemory);
    }
  });

  it("plays for full printed cost when Solarmon forbids reductions (Q6806)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX12-039", as: "target" }] },
        1: { battleArea: ["ST12-03"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("target").instanceId),
    );
    expect(s.state.memory).toBe(0);
  });

  it("activates but cannot play through Pomumon's effect-play lock (Q6807)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX12-039", as: "target" }] },
        1: { battleArea: ["BT9-047"] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("grants functional Barrier only while inherited", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "top" },
          { card: "BT1-051", as: "host", under: [cardId] },
        ],
        security: ["BT1-005"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);

    const hostId = s.perm("host").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: hostId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(true);
  });

  it("uses normal yellow and alternate Shambala evolution and rejects a nonmatch", async () => {
    for (const [baseCardId, useAlternateCost] of [
      ["BT1-045", false],
      ["EX12-006", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = 2;
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
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
