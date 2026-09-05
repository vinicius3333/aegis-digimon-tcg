import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-052";

describe("EX11-052 HeavyMetaldramon", () => {
  it("preserves the printed card, trait evolution, unsuspended deletion, trash play, and leave reaction", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "HeavyMetaldramon",
      colors: ["Purple", "Red"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 5 },
        { color: "Red", level: 5, memoryCost: 5 },
      ],
      types: ["Evil Dragon", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Dark Dragon", "Evil Dragon"], cost: 4, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving", "EndOfAttack"]) {
      expect(compiled.effects.find((candidate) => candidate.trigger === trigger)?.actions).toMatchObject([
        { kind: "Trash", target: { filter: { zone: "hand" }, count: 2 } },
        { kind: "Delete", target: { filter: { controller: "opponent", unsuspended: true } } },
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          condition: { kind: "zoneCount", op: "lte", value: 4 },
          optional: true,
        },
      ]);
    }
    expect(compiled.effects.find(({ trigger }) => trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          condition: { kind: "zoneCount", op: "lte", value: 4 },
          actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
        },
      ],
    });
  });

  it("trashes 2, deletes only an unsuspended opponent, then plays an eligible card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: ["BT1-001", "BT1-002"],
          trash: [{ card: "EX11-049", as: "punkmon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "ready" },
            { card: "BT1-009", as: "suspended", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((card) => card.permanentId)).toEqual([s.perm("suspended").permanentId]);
    expect(s.state.players[0]!.battleArea.some((card) => card.topCard.cardId === "EX11-049")).toBe(true);
    assertNoLoudGap(s);
  });

  it("skips the trash play when the post-trash hand still holds 5 cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: ["BT1-001", "BT1-002", "BT1-009", "BT1-010", "BT1-011", "BT2-024", "BT4-080"],
          trash: [{ card: "EX11-049", as: "punkmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "ready" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("punkmon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("allows the trash play at the exact 4-card hand boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: ["BT1-001", "BT1-002", "BT1-009", "BT1-010", "BT1-011", "BT2-024"],
          trash: [{ card: "EX11-049", as: "punkmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "ready" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.state.players[0]!.hand).toHaveLength(4);
    const played = s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("punkmon").instanceId,
    );
    expect(played).toBe(true);
    assertNoLoudGap(s);
  });

  it("trashes only 1 opponent security when multiple own Dark Dragons leave in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "source" },
          { card: "EX11-049", as: "first" },
          { card: "EX11-049", as: "second" },
        ],
      },
      1: { security: ["BT1-001", "BT1-002"] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId]);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    assertNoLoudGap(s);
  });
  it.each(["BT4-058", "RB1-030"])("pays the printed 4 memory for the alternate route from %s", async (baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base", under: ["BT1-009"] }],
          hand: [{ card: cardId, as: "heavy" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        instanceId: s.inst("heavy").instanceId,
        permanentId: s.perm("base").permanentId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId && s.state.players[0]!.hand.length === 0, 600);
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-009", baseCard]);
    assertNoLoudGap(s);
  });
});
