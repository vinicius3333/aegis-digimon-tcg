import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-024 Garurumon", () => {
  it("returns one opposing level 4 or lower Digimon on play and shares the once-per-turn limit with attacking", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX12-024", as: "source" }] },
        1: {
          battleArea: [
            { card: "EX12-024", as: "first" },
            { card: "EX12-025", as: "second" },
            { card: "EX12-032", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 1);
    await settle();
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("high").permanentId),
    ).toBe(true);

    const source = s.state.players[0]!.battleArea[0]!;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, source);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
  });

  it("returns an opposing level 4 or lower Digimon when attacking if the shared limit is unused", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-024", as: "source" }] },
        1: {
          battleArea: [
            { card: "EX12-024", as: "first" },
            { card: "EX12-025", as: "second" },
            { card: "EX12-032", as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("high").permanentId),
    ).toBe(true);
  });

  it("inherits once-per-turn Draw 1 and trash 1 card from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-025", as: "host", under: ["EX12-024"] }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 1 && s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("still trashes one hand card when the inherited draw cannot draw from an empty deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-025", as: "host", under: ["EX12-024"] }],
          hand: [{ card: "BT1-009", as: "discard" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.trash.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash[0]?.instanceId).toBe(s.inst("discard").instanceId);
  });

  it("survives a losing security battle through Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX12-024", as: "source" }] },
      1: { security: ["BT1-081"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("source").permanentId),
    ).toBe(true);
  });

  it("maps the catalog, Jamming, both alternate evolution filters, and the shared timing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX12-024", as: "source" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Jamming")).toBe(true);

    const card = getCardDefinition("EX12-024");
    const compiled = registeredCompiledCards.get("EX12-024")!;
    expect(card).toMatchObject({
      nameEn: "Garurumon",
      colors: ["Blue", "Purple"],
      playCost: 4,
      dp: 4000,
      level: 4,
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Beast", "NSo", "VB"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
    });
    expect(card?.effectText).toContain("level 4 or lower");
    expect(card?.inheritedEffectText).toContain("＜Draw 1＞ and trash 1 card");
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, names: ["Gabumon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["NSo", "VB"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking" && !effect.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("uses both normal colors and the Gabumon-name, NSo-trait, and VB-trait evolution routes", async () => {
    expect(digivolutionRequirementsFor("EX12-024")).toEqual([
      { level: 3, names: ["Gabumon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["NSo", "VB"], cost: 2, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["BT1-027", false, 3],
      ["BT10-071", false, 3],
      ["BT1-029", true, 2],
      ["BT26-062", true, 2],
      ["EX12-005", true, 2],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-024", as: "garurumon" }],
        },
      });
      s.state.memory = startingMemory;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("garurumon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "EX12-024");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-3 Digimon that is neither Gabumon nor NSo/VB", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "base" }],
        hand: [{ card: "EX12-024", as: "garurumon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("garurumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
