import { assemblyRequirementFor, compiledEffects, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-031";

describe("EX12-031 MarineBullmon", () => {
  it("matches the catalog's Decode, Rule trait, evolution, Assembly, and placement clauses", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "MarineBullmon",
      colors: ["Blue", "Yellow"],
      playCost: 7,
      dp: 7000,
      level: 5,
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Mollusk", "Shambala", "TB"],
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
    });
    expect(card?.effectText).toContain("1 or fewer digivolution cards");
    expect(card?.inheritedEffectText).toContain("Decode");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Aquatic", "Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(assemblyRequirementFor(cardId)).toEqual([
      {
        materials: [
          {
            count: 1,
            nameOrTrait: [
              { tokens: ["Aqua", "Sea Animal"], match: "traitContains" },
              { tokens: ["TB"], match: "trait" },
            ],
            levelMax: 4,
          },
        ],
        reduceCost: 2,
      },
    ]);
    expect(compiled.assemblyRequirement).toEqual(assemblyRequirementFor(cardId));
    expect(compiled.effects.find((entry) => entry.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            to: "hand",
            optional: true,
            abortOnDecline: true,
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 1 } },
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                filter: {
                  controller: "mine",
                  levelComparison: { op: "lte", value: 6 },
                  nameOrTrait: [
                    { tokens: ["Aqua", "Sea Animal"], match: "traitContains" },
                    { tokens: ["TB"], match: "trait" },
                  ],
                },
                count: 1,
                from: ["hand"],
              },
            },
          },
        ],
      });
    }
    const decodeEffects = compiled.effects.filter((entry) =>
      entry.actions.some((action) => action.kind === "Replacement" && action.event === "wouldLeavePlay"),
    );
    expect(decodeEffects).toHaveLength(2);
    expect(decodeEffects.map((entry) => entry.isInherited === true)).toEqual([false, true]);
    for (const effect of decodeEffects) {
      expect(effect).toMatchObject({
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
                    kind: ["Digimon"],
                    hostFilter: { isSelfRef: true },
                    levelComparison: { op: "lte", value: 4 },
                    nameOrTrait: [
                      { tokens: ["Aqua", "Sea Animal"], match: "traitContains" },
                      { tokens: ["TB"], match: "trait" },
                    ],
                  },
                },
              },
            ],
          },
        ],
      });
    }
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("assembles with a level-4-or-lower TB card, places the required bottom source, and returns an eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX12-026", as: "effectMaterial" },
          ],
          trash: [{ card: "EX12-011", as: "assemblyMaterial" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: [s.inst("assemblyMaterial").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await s.ready();

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === cardId)!;
    expect(s.state.memory).toBe(0);
    expect(played.stack.map((card) => card.cardId)).toEqual(["EX12-026", "EX12-011"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("accepts Aquatic as an Aqua-containing Assembly trait and applies the level ceiling to both OR branches (Q6767)", async () => {
    const valid = setupEngine({
      0: {
        hand: [{ card: cardId, as: "source" }],
        trash: [{ card: "BT12-025", as: "aquatic" }],
      },
    });
    valid.state.memory = 5;
    expect(
      valid.engine.applyIntent(0, {
        type: "playCard",
        instanceId: valid.inst("source").instanceId,
        assembly: { materialInstanceIds: [valid.inst("aquatic").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.state.players[0]!.battleArea.length === 1);
    expect(valid.state.memory).toBe(0);

    for (const materialCardId of ["BT10-023", "EX12-031"]) {
      const invalid = setupEngine({
        0: {
          hand: [{ card: cardId, as: "source" }],
          trash: [{ card: materialCardId, as: "tooHigh" }],
        },
      });
      invalid.state.memory = 7;
      expect(
        invalid.engine.applyIntent(0, {
          type: "playCard",
          instanceId: invalid.inst("source").instanceId,
          assembly: { materialInstanceIds: [invalid.inst("tooHigh").instanceId] },
        }),
      ).toEqual({ ok: false, reason: "invalid-material" });
    }
  });

  it("places a level-6 Aquatic card at the true stack bottom and returns a target with one source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT10-027", as: "aquatic" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "target", under: ["BT1-001"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT10-027"]);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("does not pay with a level-7 TB card and does not return a target with two sources (Q6767)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX12-076", as: "tooHigh" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "target", under: ["BT1-001", "BT1-002"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("allows the placement payment to be declined and suppresses the dependent return", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT12-025", as: "preserved" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("source").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("preserved").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("resolves the same Sea Animal placement and return when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-010", as: "base" }],
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-033", as: "seaAnimal" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "target", under: ["BT1-001"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("base").topCard?.cardId).toBe(cardId);
    expect(s.perm("base").stack[0]?.cardId).toBe("BT1-033");
  });

  it("executes its top-level Decode for Aqua-containing and exact-TB sources, but not battle leaves", async () => {
    for (const decodeCardId of ["BT12-025", "EX12-011"]) {
      const s = setupEngine(
        { 0: { battleArea: [{ card: cardId, as: "host", under: [{ card: decodeCardId, as: "decode" }] }] } },
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
      { 0: { battleArea: [{ card: cardId, as: "host", under: [{ card: "BT12-025", as: "decode" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await battle.ready();
    expect(await advance(battle.engine).verb.deletePermanent([battle.perm("host").permanentId], "byBattle")).toBe(1);
    expect(battle.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("plays only from its own digivolution cards, never from a neighbor's stack (CR 16-36-1)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "host" },
            { card: "BT1-011", as: "neighbor", under: [{ card: "BT12-025", as: "foreign" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const foreignId = s.inst("foreign").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === foreignId)).toBe(false);
    expect(s.perm("neighbor").stack.some((card) => card.instanceId === foreignId)).toBe(true);
  });

  it("executes inherited Decode on the host and rejects an Aqua-containing level-5 source", async () => {
    const inherited = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-011",
              as: "host",
              under: [
                { card: cardId, as: "source" },
                { card: "BT12-025", as: "decode" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await inherited.ready();
    const decodeId = inherited.inst("decode").instanceId;
    expect(await advance(inherited.engine).verb.deletePermanent([inherited.perm("host").permanentId], "byEffect")).toBe(
      1,
    );
    await settle(() =>
      inherited.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === decodeId),
    );
    expect(inherited.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === decodeId)).toBe(
      true,
    );

    const tooHigh = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "host", under: [{ card: "BT10-023", as: "decode" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await tooHigh.ready();
    expect(await advance(tooHigh.engine).verb.deletePermanent([tooHigh.perm("host").permanentId], "byEffect")).toBe(1);
    expect(tooHigh.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("uses both normal colors and both level-4 trait evolution alternatives", async () => {
    expect(digivolutionRequirementsFor(cardId)).toEqual([
      { level: 4, traits: ["Aquatic", "Shambala"], cost: 3, isAlternate: true },
    ]);
    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["AD1-010", false, 4],
      ["BT1-051", false, 4],
      ["BT12-025", true, 3],
      ["EX12-011", true, 3],
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

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT10-074", as: "base" }], hand: [{ card: cardId, as: "source" }] },
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

  it("grants its printed Rule trait Aquatic", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "source" },
          { card: "BT1-011", as: "inheritedHost", under: [cardId] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("source"), "Aquatic")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Decode")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("inheritedHost"), "Decode")).toBe(true);
  });
});
