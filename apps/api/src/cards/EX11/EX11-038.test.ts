import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-038";

describe("EX11-038 Sunarizamon", () => {
  it("preserves printed stats, cross-stack trash cost, and inherited discard trigger", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Sunarizamon",
      colors: ["Black"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      types: ["Reptile", "LIBERATOR", "Mineral"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([]);
    expect(digivolutionRequirementsFor(cardId)).toEqual([]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "Draw",
        amount: 1,
        optional: true,
        abortOnDecline: true,
        cost: { kind: "trash", target: { from: ["hand", "digivolutionCards"], count: 1 } },
      });
      expect(irNode(effect.actions[0]!.cost).target.filter.nameOrTrait).toEqual([
        { tokens: ["Mineral", "Rock"], match: "trait" },
      ]);
    }
    const inherited = compiled.effects.find((effect) => effect.isInherited)!;
    expect(inherited).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: { controller: "mine" },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
  });

  it("pays the draw cost with a Mineral card under another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-080", as: "other", under: [{ card: "EX11-044", as: "mineralCost" }] }],
          hand: [{ card: cardId, as: "source" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(s.perm("other").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("mineralCost").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    assertNoLoudGap(s);
  });

  it("accepts the alternate Rock trait from hand on public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT13-061", as: "rockCost" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId: id }) => id === "BT1-009"));
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("rockCost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(["BT1-009"]);
    assertNoLoudGap(s);
  });

  it("uses the public When Moving path and can pay from another stack", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: cardId, as: "source" },
          battleArea: [{ card: "BT1-080", as: "other", under: [{ card: "EX11-044", as: "mineralCost" }] }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-010"], deck: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Breeding" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("source").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));
    expect(s.perm("other").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    assertNoLoudGap(s);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("draws when trashed by an effect from a Mineral host's evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-042", as: "host", under: [cardId, cardId, cardId] }],
          hand: [{ card: "EX11-044", as: "evolver" }],
          deck: ["BT1-009", "BT1-010", "BT1-013"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolver").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "EX11-044");
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(["BT1-009", "BT1-010", "BT1-013"]);
    assertNoLoudGap(s);
  });

  it("draws nothing when no Mineral or Rock card can pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "BT1-009", as: "plain" },
          ],
          deck: [{ card: "BT1-009", as: "undrawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("plain").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
