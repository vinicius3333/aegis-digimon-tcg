import {
  compiledEffects,
  digivolutionRequirementsFor,
  dnaDigivolutionRequirementsFor,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-032";

describe("EX12-032 WereGarurumon", () => {
  it("matches the catalog's evolution, DNA, restriction, attack, and Decode clauses", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "WereGarurumon",
      colors: ["Blue", "Purple"],
      playCost: 7,
      dp: 7000,
      level: 5,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Beastkin", "NSo", "VB"],
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
    });
    expect(card?.effectText).toContain("2 or more same-level cards");
    expect(card?.inheritedEffectText).toContain("Decode");
    const dna = [
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 5 },
          { color: "Purple", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 5 },
          { color: "Red", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 5 },
          { color: "Purple", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 5 },
          { color: "Red", level: 5 },
        ],
      },
    ];
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Garurumon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["NSo", "VB"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.dnaDigivolveRequirement).toEqual(dna);
    expect(dnaDigivolutionRequirementsFor(cardId)).toEqual(dna);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            restriction: "suspend",
            duration: "untilOpponentTurnEnd",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking" && !effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          reduceCost: 2,
          optional: true,
          condition: { kind: "stackHasSameLevelCards", count: 2 },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Garurumon"], match: "name" },
              { tokens: ["NSo", "VB"], match: "trait" },
            ],
          },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Decode" }],
    });
    expect(
      compiled.effects.find((effect) =>
        effect.actions.some((action) => action.kind === "Replacement" && action.event === "wouldLeavePlay"),
      ),
    ).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
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
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [
                    { tokens: ["Gabumon", "Garurumon"], match: "name" },
                    { tokens: ["NSo", "VB"], match: "trait" },
                  ],
                },
              },
            },
          ],
        },
      ],
    });
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("restricts one opposing Digimon from suspending until the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended")).toBe(true);
  });

  it("applies the same suspension restriction to an opposing Tamer when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "base" }],
          hand: [{ card: cardId, as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-085", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("tamer"), "beSuspended"));

    expect(observe(s.engine).isRestricted(s.perm("tamer"), "beSuspended")).toBe(true);
  });

  it("digivolves from the trash only when its stack has two same-level cards", async () => {
    const valid = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "host", under: ["BT1-040"] }],
          trash: [{ card: "BT1-044", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 2;
    await valid.ready();
    await advance(valid.engine).fire(EffectTiming.OnUseAttack, valid.perm("host"));
    await settle(() => valid.perm("host").topCard.cardId === "BT1-044");
    expect(valid.perm("host").topCard.cardId).toBe("BT1-044");
    expect(valid.state.memory).toBe(1);
    expect(valid.state.players[0]!.trash.some((card) => card.cardId === "BT1-044")).toBe(false);

    const invalid = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "host", under: ["BT1-009"] }],
          trash: [{ card: "BT1-044", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    invalid.state.memory = 2;
    await invalid.ready();
    await advance(invalid.engine).fire(EffectTiming.OnUseAttack, invalid.perm("host"));
    await settle();
    expect(invalid.perm("host").topCard.cardId).toBe(cardId);
    expect(invalid.state.players[0]!.trash.some((card) => card.cardId === "BT1-044")).toBe(true);
  });

  it("counts two same-level sources even when their level differs from the top card (Q6768)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "host", under: ["BT1-036", "BT1-014"] }],
          trash: [{ card: "BT1-044", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.perm("host").topCard.cardId === "BT1-044");

    expect(s.perm("host").topCard.cardId).toBe("BT1-044");
    expect(s.state.memory).toBe(1);
  });

  it("executes inherited Decode for both name and trait matches but not battle deletion", async () => {
    for (const decodeCardId of ["BT1-036", "EX8-010"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT1-011",
                as: "host",
                under: [
                  { card: cardId, as: "source" },
                  { card: decodeCardId, as: "decode" },
                ],
              },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const decodeId = s.inst("decode").instanceId;

      expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
      await settle(() =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === decodeId),
      );
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === decodeId)).toBe(true);
    }

    const battle = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-011",
              as: "host",
              under: [
                { card: cardId, as: "source" },
                { card: "BT1-036", as: "decode" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await battle.ready();
    expect(await advance(battle.engine).verb.deletePermanent([battle.perm("host").permanentId], "byBattle")).toBe(1);
    expect(battle.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("applies Decode's level-4 ceiling to both name and trait alternatives (Q6769)", async () => {
    for (const decodeCardId of ["BT23-056", "EX8-060"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT1-011",
                as: "host",
                under: [
                  { card: cardId, as: "source" },
                  { card: decodeCardId, as: "tooHigh" },
                ],
              },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
    }
  });

  it("uses both normal colors and both cost-3 alternate evolution paths", async () => {
    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["BT1-036", false, 4],
      ["BT10-074", false, 4],
      ["EX4-043", true, 3],
      ["EX12-010", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = startingMemory;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }

    for (const baseCardId of ["BT23-056", "EX8-060"]) {
      const invalid = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      expect(
        invalid.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: invalid.perm("base").permanentId,
          instanceId: invalid.inst("source").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
    }
  });

  it("DNA digivolves through all four printed color pairs for zero and rejects an invalid pair", async () => {
    for (const [firstCardId, secondCardId] of [
      ["BT1-040", "BT2-078"],
      ["BT1-040", "EX12-016"],
      ["EX12-044", "BT2-078"],
      ["EX12-044", "EX12-016"],
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
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === cardId));
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-040", as: "first" },
          { card: "EX12-044", as: "second" },
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

  it("exposes Decode only through its inherited effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "source" },
          { card: "BT1-011", as: "host", under: [cardId] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Decode")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Decode")).toBe(true);
  });
});
