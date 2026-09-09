import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
          hand: [{ card: cardId, as: "source" }, "BT1-013", "BT1-014"],
          trash: [{ card: "EX11-049", as: "punkmon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "ready" },
            { card: "BT1-009", as: "suspended", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.map((card) => card.permanentId)).toEqual([s.perm("suspended").permanentId]);
    expect(s.state.players[0]!.battleArea.some((card) => card.topCard.cardId === "EX11-049")).toBe(true);
    assertNoLoudGap(s);
  });

  it("skips the trash play when the post-trash hand still holds 5 cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            "BT1-013",
            "BT1-014",
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT2-024",
            "BT4-080",
          ],
          trash: [{ card: "EX11-049", as: "punkmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "ready" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));

    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("punkmon").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("allows the trash play at the exact 4-card hand boundary", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "source" }, "BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011", "BT2-024"],
          trash: [{ card: "EX11-049", as: "punkmon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "ready" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 13;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));

    expect(s.state.players[0]!.hand).toHaveLength(4);
    const played = s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.instanceId === s.inst("punkmon").instanceId,
    );
    expect(played).toBe(true);
    assertNoLoudGap(s);
  });

  it("resolves EX11-050 Scapegoat before EX11-052 replacement on a Dark/Evil Dragon departure (Q5906)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source", suspended: true },
            { card: "EX11-050", as: "scapegoatProvider" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-016", as: "attacker", dp: 20000 }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Scapegoat")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("source").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length < 3 ||
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("scapegoatProvider").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("source").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("scapegoatProvider").instanceId)).toBe(
      true,
    );
    expect(s.state.players[1]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("does not replace a non-battle deletion when the hand is above the four-card threshold", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source", dp: 5000 }],
          hand: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [],
          hand: [{ card: "ST7-07", as: "removal" }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Scapegoat")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("removal").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("trashes only 1 opponent security when multiple own Dark Dragons leave in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "source" },
          { card: "EX11-049", as: "first", suspended: true, dp: 1000 },
          { card: "EX11-049", as: "second", suspended: true, dp: 1000 },
        ],
      },
      1: {
        security: ["BT1-009", "BT1-010"],
        battleArea: [
          { card: "BT1-080", as: "attacker1", dp: 20000 },
          { card: "BT1-080", as: "attacker2", dp: 20000 },
        ],
      },
    });
    await s.ready();
    s.state.turnSeat = 1;
    const firstPermanentId = s.perm("first").permanentId;
    const secondPermanentId = s.perm("second").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker1").permanentId,
        target: { kind: "permanent", permanentId: firstPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every(({ permanentId }) => permanentId !== firstPermanentId));
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "permanent", permanentId: secondPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every(({ permanentId }) => permanentId !== secondPermanentId));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("runs the public When Digivolving cost and unsuspended deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-058", as: "base" }],
          hand: [{ card: cardId, as: "heavy" }, "BT1-013", "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-010"], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("heavy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("runs the public End of Attack cost and unsuspended deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: ["BT1-013", "BT1-014"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-010"], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it.each(["BT4-058", "RB1-030"])("pays the printed 4 memory for the alternate route from %s", async (baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base", under: ["BT1-009"] }],
          hand: [{ card: cardId, as: "heavy" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
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
