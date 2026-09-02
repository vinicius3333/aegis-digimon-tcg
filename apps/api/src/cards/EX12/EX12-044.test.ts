import {
  compiledEffects,
  digivolutionRequirementsFor,
  dnaDigivolutionRequirementsFor,
  EffectTiming,
  getCardDefinition,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-044";
const dna = [
  {
    cost: 0,
    materials: [
      { color: "Yellow", level: 4 },
      { color: "Green", level: 4 },
    ],
  },
  {
    cost: 0,
    materials: [
      { color: "Yellow", level: 4 },
      { color: "Black", level: 4 },
    ],
  },
  {
    cost: 0,
    materials: [
      { color: "Blue", level: 4 },
      { color: "Green", level: 4 },
    ],
  },
  {
    cost: 0,
    materials: [
      { color: "Blue", level: 4 },
      { color: "Black", level: 4 },
    ],
  },
];

describe("EX12-044 Angewomon", () => {
  it("matches the catalog, triggers, evolution routes, DNA recipes, and executable Decode", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;

    expect(card).toMatchObject({
      nameEn: "Angewomon",
      colors: ["Yellow"],
      playCost: 7,
      dp: 7000,
      level: 5,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Archangel", "NSp", "VB"],
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["NSp", "VB"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.dnaDigivolveRequirement).toEqual(dna);
    expect(dnaDigivolutionRequirementsFor(cardId)).toEqual(dna);

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "ModifyDP",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        amount: -4000,
        duration: "forTheTurn",
      });
    }
    expect(
      compiled.effects.find((effect) => effect.trigger === "WhenAttacking" && effect.actions[0]?.kind === "Digivolve"),
    ).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          reduceCost: 2,
          optional: true,
          condition: { kind: "stackHasSameLevelCards", count: 2 },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Angel", "Holy Dragon", "Three Great Angels", "NSp", "VB"], match: "trait" }],
          },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited && effect.actions.length === 0)).toMatchObject({
      keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.4 or lower w/[Holy Beast]/[NSp]/[VB] trait)＞" }],
    });
    expect(
      compiled.effects.find((effect) => effect.isInherited && effect.actions[0]?.kind === "Replacement"),
    ).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
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
                  hostFilter: { isSelfRef: true },
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [{ tokens: ["Holy Beast", "NSp", "VB"], match: "trait" }],
                },
              },
            },
          ],
        },
      ],
    });
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("applies -4000 DP independently on play, digivolution, and attack", async () => {
    for (const timing of [EffectTiming.OnPlay, EffectTiming.WhenDigivolving, EffectTiming.OnUseAttack]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: cardId, as: "source" }] },
          1: { battleArea: [{ card: "BT1-011", as: "opponent", dp: 8000 }] },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).fire(timing, s.perm("source"));
      expect(s.perm("opponent").currentDP).toBe(4000);
    }
  });

  it("digivolves for two less when two digivolution cards share a level", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT1-051", "BT1-052"] }],
          hand: [{ card: "BT1-063", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => s.perm("source").topCard.cardId === "BT1-063");

    expect(s.state.memory).toBe(0);
  });

  it("counts the top card together with a same-level digivolution card (Q6808)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT1-057", "BT1-051"] }],
          hand: [{ card: "BT1-063", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => s.perm("source").topCard.cardId === "BT1-063");

    expect(s.state.memory).toBe(0);
  });

  it("does not offer attack digivolution when every stack level is distinct", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", under: ["BT1-051", "BT1-049"] }],
          hand: [{ card: "BT1-063", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));

    expect(s.perm("source").topCard.cardId).toBe(cardId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("target").instanceId);
    expect(s.state.memory).toBe(1);
  });

  it("executes inherited Decode for Holy Beast, NSp, and VB level-4 cards", async () => {
    for (const decodeCardId of ["BT1-051", "EX7-018", "EX12-010"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-058", as: "host", under: [cardId, { card: decodeCardId, as: "candidate" }] }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      const candidateId = s.inst("candidate").instanceId;
      expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
      await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === candidateId));
      expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === candidateId)).toBe(true);
    }
  });

  it("never Decodes a card out of another of your Digimon's digivolution cards (CR 16-36-1)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Only the second stack holds a legal Decode candidate, and it belongs to a
            // different permanent, so the leaving host must find nothing to play.
            { card: "BT1-058", as: "host", under: [cardId] },
            { card: "BT1-058", as: "neighbor", under: [{ card: "BT1-051", as: "candidate" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const candidateId = s.inst("candidate").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === candidateId)).toBe(false);
    expect(s.perm("neighbor").stack.some(({ instanceId }) => instanceId === candidateId)).toBe(true);
  });

  it("does not Decode a level-5 match or a battle deletion", async () => {
    const tooHigh = setupEngine(
      { 0: { battleArea: [{ card: "BT1-058", as: "host", under: [cardId, "BT1-058"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await tooHigh.ready();
    expect(await advance(tooHigh.engine).verb.deletePermanent([tooHigh.perm("host").permanentId], "byEffect")).toBe(1);
    expect(tooHigh.state.players[0]!.battleArea).toHaveLength(0);

    const battle = setupEngine(
      { 0: { battleArea: [{ card: "BT1-058", as: "host", under: [cardId, "BT1-051"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await battle.ready();
    expect(await advance(battle.engine).verb.deletePermanent([battle.perm("host").permanentId], "byBattle")).toBe(1);
    expect(battle.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("exposes Decode only while inherited", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "top" },
          { card: "BT1-058", as: "host", under: [cardId] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Decode")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Decode")).toBe(true);
  });

  it("uses normal yellow and alternate off-color NSp evolution and rejects a nonmatch", async () => {
    for (const [baseCardId, useAlternateCost] of [
      ["BT1-051", false],
      ["EX7-018", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = 3;
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
      0: { battleArea: [{ card: "AD1-010", as: "base" }], hand: [{ card: cardId, as: "source" }] },
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

  it("DNA digivolves through all four printed color pairs and rejects an invalid pair", async () => {
    for (const [firstCardId, secondCardId] of [
      ["BT1-051", "BT1-069"],
      ["BT1-051", "BT10-061"],
      ["AD1-010", "BT1-069"],
      ["AD1-010", "BT10-061"],
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
          { card: "BT1-051", as: "first" },
          { card: "AD1-010", as: "second" },
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
