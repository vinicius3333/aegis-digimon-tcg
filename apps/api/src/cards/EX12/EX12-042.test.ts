import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-042";

describe("EX12-042 Gatomon", () => {
  it("matches the catalog, effects, and all evolution requirements", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;

    expect(card).toMatchObject({
      nameEn: "Gatomon",
      colors: ["Yellow", "Green"],
      playCost: 4,
      dp: 4000,
      level: 4,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "NSp", "VB"],
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Green", level: 3, memoryCost: 3 },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Salamon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["NSp", "VB"], cost: 2, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);

    const triggered = compiled.effects.filter(({ trigger }) => ["OnPlay", "WhenAttacking"].includes(trigger));
    expect(triggered).toHaveLength(2);
    for (const effect of triggered) {
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
          {
            kind: "GainKeyword",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            keyword: { keyword: "Recovery", amount: 1, raw: "＜Recovery +1＞" },
            duration: "permanent",
          },
        ],
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
      }),
    );
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("returns the top security card and recovers one on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: ["BT1-010"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("BT1-010");
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-009"]);
  });

  it("can activate and recover from an empty security stack (Q6804)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: [],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-009"]);
  });

  it("shares Once Per Turn between the On Play and When Attacking triggers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          security: ["BT1-010"],
          deck: ["BT1-009", "BT1-008"],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));

    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck.map(({ cardId: id }) => id)).toEqual(["BT1-008"]);
  });

  it("has Blocker only as a top card and grants functional Barrier only while inherited", async () => {
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

    expect(observe(s.engine).hasKeyword(s.perm("top"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);
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

  it("uses both normal colors and both alternate evolution predicates", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["BT1-045", false, 3],
      ["BT1-064", false, 3],
      ["BT9-072", true, 2],
      ["EX7-015", true, 2],
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
  });

  it("rejects the alternate route from a non-Salamon without NSp or VB", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
