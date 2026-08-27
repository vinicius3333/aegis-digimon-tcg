import { compiledEffects, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-039";

describe("EX12-039 Takinmon", () => {
  it("matches the catalog, SW cost replacement, evolution route, and inherited Barrier", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "Takinmon",
      colors: ["Yellow"],
      playCost: 3,
      dp: 2000,
      level: 3,
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Beast", "Shambala", "SW"],
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Shambala"], cost: 0, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["SW"], match: "trait" }] },
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

  it("reduces only a battle-area digivolution into an SW Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-039", as: "source" }],
        hand: [{ card: "EX12-043", as: "target" }],
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
    await settle(() => s.perm("source").topCard?.cardId === "EX12-043");

    expect(s.state.memory).toBe(0);
    expect(s.perm("source").topCard?.cardId).toBe("EX12-043");
  });

  it("does not reduce a non-SW digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX12-039", as: "source" }],
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

    expect(s.state.memory).toBe(-1);
  });

  it("does not trigger in the breeding area and inherits Barrier", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX12-039", as: "source" },
        hand: [{ card: "EX12-043", as: "target" }],
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
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "EX12-043");

    expect(s.state.memory).toBe(-1);
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

  it("uses normal yellow and alternate Shambala evolution for zero and rejects a nonmatch", async () => {
    for (const [baseCardId, useAlternateCost] of [
      ["BT1-005", false],
      ["EX12-004", true],
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
