import { compiledEffects, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-040";

describe("EX12-040 Salamon", () => {
  it("matches the catalog, destination reduction, evolution routes, and inherited Barrier", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "Salamon",
      colors: ["Yellow"],
      playCost: 3,
      dp: 2000,
      level: 3,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mammal", "VB"],
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Nyaromon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["VB"], cost: 0, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Holy Beast", "VB"], match: "trait" }],
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    });
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("reduces only a battle-area digivolution into a Holy Beast or VB Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-040", as: "source" }],
        hand: [{ card: "BT1-051", as: "target" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT1-051");

    expect(s.state.memory).toBe(0);
  });

  it("does not reduce a non-Holy Beast and non-VB digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-040", as: "source" }],
        hand: [{ card: "BT1-053", as: "target" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.cardId === "BT1-053");

    expect(s.state.memory).toBe(-1);
  });

  it("does not trigger in the breeding area and inherits Barrier", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX12-040", as: "source" },
        hand: [{ card: "BT1-051", as: "target" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-051");

    expect(s.state.memory).toBe(-1);
  });

  it("binds the destination trait gate to the replacement, not the source", () => {
    const replacement = registeredCompiledCards
      .get("EX12-040")!
      .effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(replacement).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Holy Beast", "VB"], match: "trait" }],
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("reduces the VB destination branch independently", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX12-013", as: "target" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX12-013");
    expect(s.state.memory).toBe(0);
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
  });

  it("uses normal yellow, Nyaromon-name, and level-2 VB evolution routes for zero", async () => {
    for (const [baseCardId, useAlternateCost] of [
      ["BT1-005", false],
      ["EX5-003", true],
      ["EX12-001", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
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
      0: { battleArea: [{ card: "BT10-005", as: "base" }], hand: [{ card: cardId, as: "source" }] },
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
