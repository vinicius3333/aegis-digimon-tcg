import {
  EffectTiming,
  assemblyRequirementFor,
  compiledEffects,
  dnaDigivolutionRequirementsFor,
  digivolutionRequirementsFor,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

const cardId = "EX12-035";

describe("EX12-035 MetalGarurumon", () => {
  it("matches the catalog and committed IR clause for clause", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "MetalGarurumon",
      colors: ["Blue", "Purple"],
      playCost: 12,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Cyborg", "ME", "VB"],
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Purple", level: 5, memoryCost: 4 },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["Garurumon"], cost: 3, isAlternate: true },
      { level: 5, traits: ["ME", "VB"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(dnaDigivolutionRequirementsFor(cardId)).toEqual(compiled.dnaDigivolveRequirement);
    expect(assemblyRequirementFor(cardId)).toEqual(compiled.assemblyRequirement);
    expect(
      compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords ?? []),
    ).toEqual([
      { keyword: "Evade", raw: "＜Evade＞" },
      { keyword: "Decode", raw: "＜Decode (Lv.5 or lower w/[Gabumon]/[Garurumon] in name or w/[ME]/[VB] trait)＞" },
    ]);
    expect(
      compiled.effects.find(({ actions }) => actions.some((action) => action.kind === "Replacement")),
    ).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
              target: {
                filter: {
                  levelComparison: { op: "lte", value: 5 },
                  nameOrTrait: [
                    { tokens: ["Gabumon", "Garurumon"], match: "name" },
                    { tokens: ["ME", "VB"], match: "trait" },
                  ],
                },
              },
            },
          ],
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "TrashDigivolution", target: { count: "all" }, amount: 4, scope: "acrossDigimon" },
          {
            kind: "Return",
            to: "deckBottom",
            target: { filter: { digivolutionCardsCompareToSource: "lte" }, count: 1 },
          },
        ],
      });
    }
    expect(compiled.effects.find(({ frequency }) => frequency === "OncePerTurn")).toMatchObject({
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controllerDefault: "any", kind: ["Digimon"] } },
        {
          kind: "SubTrigger",
          event: "whenAnyDigivolves",
          sourceFilter: { controllerDefault: "any", kind: ["Digimon"] },
        },
      ],
    });
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("trashes four cards across stacks, then respects the source-stack return ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source", under: ["BT1-029"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", under: ["BT1-010", "BT1-011"] },
            { card: "BT1-014", as: "second", under: ["BT1-012", "BT1-013"] },
            { card: "BT1-021", under: ["BT1-001", "BT1-002", "BT1-003"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.trash.length === 4 && s.state.players[1]!.battleArea.length === 2);
    expect(s.state.players[1]!.trash).toHaveLength(4);
    expect(s.state.players[1]!.deck.some(({ cardId: id }) => id === "BT1-009" || id === "BT1-014")).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-021")).toBe(true);
  });

  it("executes Decode for both identity branches, not battle deletion, and enforces Q6779", async () => {
    for (const decodeCardId of ["BT23-056", "EX12-044"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: cardId, as: "source", suspended: true, under: [{ card: decodeCardId, as: "decode" }] },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const decodeId = s.inst("decode").instanceId;
      expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect")).toBe(1);
      expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === decodeId)).toBe(true);
    }
    for (const [decodeCardId, cause] of [
      ["BT1-044", "byEffect"],
      ["EX12-017", "byEffect"],
      ["BT23-056", "byBattle"],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: cardId, as: "source", suspended: true, under: [{ card: decodeCardId, as: "candidate" }] },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], cause)).toBe(1);
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
    }
  });

  it("resolves Decode and accepted Evade in the same deletion window (Q6784)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "source", under: [{ card: "BT23-056", as: "decode" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;
    const deletion = advance(s.engine).verb.deletePermanent([sourceId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: sourceId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("decode").instanceId),
    ).toBe(true);
  });

  it("can Decode again after Evade leaves a 0-DP MetalGarurumon for the next rule check (Q6783)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: cardId,
              as: "source",
              under: [
                { card: "BT23-056", as: "firstDecode" },
                { card: "EX12-044", as: "secondDecode" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const sourceId = s.perm("source").permanentId;

    const firstRuleDeletion = advance(s.engine).verb.deletePermanent([sourceId], "byRule");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: sourceId, accept: true })).toEqual({
      ok: true,
    });
    expect(await firstRuleDeletion).toBe(0);
    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byRule")).toBe(1);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstDecode").instanceId, s.inst("secondDecode").instanceId]),
    );
  });

  it("uses both normal colors and both cost-3 alternate evolution branches", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["BT1-040", false, 4],
      ["BT2-078", false, 4],
      ["BT23-056", true, 3],
      ["EX12-044", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = memory;
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
      0: { battleArea: [{ card: "BT1-020", as: "base" }], hand: [{ card: cardId, as: "source" }] },
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

  it("DNA digivolves through all four printed pairs and rejects an invalid pair", async () => {
    for (const [firstCardId, secondCardId] of [
      ["BT1-040", "BT2-078"],
      ["BT1-040", "EX12-044"],
      ["BT23-056", "BT2-078"],
      ["BT23-056", "EX12-044"],
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
          { card: "BT1-040", as: "first" },
          { card: "BT23-056", as: "second" },
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

  it("enforces each Assembly material's level and identity independently (Q6780)", async () => {
    const valid = setupEngine({
      0: {
        hand: [{ card: cardId, as: "source" }],
        trash: [
          { card: "BT23-056", as: "m0" },
          { card: "EX12-010", as: "m1" },
          { card: "EX12-021", as: "m2" },
        ],
      },
    });
    valid.state.memory = 6;
    expect(
      valid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: valid.inst("source").instanceId,
        assembly: {
          materialInstanceIds: [valid.inst("m0").instanceId, valid.inst("m1").instanceId, valid.inst("m2").instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(valid.state.memory).toBe(0);

    for (const materials of [
      ["BT1-020", "EX12-010", "EX12-021"],
      ["BT23-056", "EX12-005", "EX12-021"],
      ["BT23-056", "EX12-010", "BT1-001"],
    ]) {
      const s = setupEngine({
        0: {
          hand: [{ card: cardId, as: "source" }],
          trash: materials.map((card, index) => ({ card, as: `m${index}` })),
        },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("source").instanceId,
          assembly: { materialInstanceIds: materials.map((_, index) => s.inst(`m${index}`).instanceId) },
        }),
      ).toEqual({ ok: false, reason: "invalid-material" });
    }
  });

  it("triggers for either player's play or digivolution, including itself (Q6781)", async () => {
    for (const [event, opponentSubject] of [
      ["whenPlayed", false],
      ["whenPlayed", true],
      ["whenAnyDigivolves", false],
      ["whenAnyDigivolves", true],
    ] as const) {
      const s = setupEngine(
        { 0: { battleArea: [{ card: cardId, as: "source" }] }, 1: { battleArea: [{ card: "BT1-014", as: "target" }] } },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).fireSubTrigger(event, {
        subjectPermanentId: opponentSubject ? s.perm("target").permanentId : s.perm("source").permanentId,
      });
      await settle(() => observe(s.engine).isRestricted(s.perm("target"), "beSuspended"));
      expect(observe(s.engine).isRestricted(s.perm("target"), "beSuspended")).toBe(true);
    }
  });
});
