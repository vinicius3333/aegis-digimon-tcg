import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-033";

describe("EX11-033 Maneuvermon", () => {
  it("preserves catalog, exact text requirement, public zones, and scoped IR", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Maneuvermon",
      colors: ["Green"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Green", level: 4, memoryCost: 3 }],
      types: ["Beast", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Maquinamon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["WhenMoving", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand", "linked"],
        payCost: false,
        optional: true,
        target: {
          filter: { hostFilter: { isSelfRef: true }, nameOrTrait: [{ tokens: ["Maquinamon"], match: "nameExact" }] },
        },
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "Suspend" },
            { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
          ],
        },
      ],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenDeletesInBattle",
            sourceFilter: { isSelfRef: true },
          }),
        ],
      }),
    );
  });

  it("plays exact Maquinamon from hand on a real public When Moving", async () => {
    const s = setupEngine(
      {
        0: { breeding: { card: cardId, as: "source" }, hand: [{ card: "EX11-027", as: "maquinamon" }] },
        1: { security: ["BT1-009"], deck: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("source").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-027"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
    await settle(() => s.state.phase === "Main" && s.state.pendingDecision === undefined);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.turnSeat === 1 && s.state.phase === "Main");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("plays exact Maquinamon from hand on public alternate evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-040", as: "base" }],
          hand: [
            { card: cardId, as: "evolver" },
            { card: "EX11-027", as: "maquinamon" },
          ],
        },
        1: { security: ["BT1-009"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === cardId &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-027"),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("uses only a public self-link for suspension and applies the opponent-turn-end restriction", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX11-027", as: "link" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-010"], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("source").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("keeps the public link path observable when the host starts at 0 DP", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source", dp: 0 }], hand: [{ card: "EX11-027", as: "link" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("source").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").linked.some((card) => card.cardId === "EX11-027"));
    expect(s.perm("source").linked.some((card) => card.cardId === "EX11-027")).toBe(true);
    assertNoLoudGap(s);
  });

  it("unsuspends the surviving inherited host after a public battle deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-034", as: "host", under: [cardId], dp: 13000 }] },
        1: { battleArea: [{ card: "EX11-034", as: "target", suspended: true }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.turnCount = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-034"));
    // The target exceeds EX11-034's 8-cost public DeleteBudget, so it is deleted by the
    // actual battle after the security-choice prompt and emits whenDeletesInBattle.
    expect(s.state.players[1]!.trash.some(({ cardId: trashedId }) => trashedId === "EX11-034")).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });
});
