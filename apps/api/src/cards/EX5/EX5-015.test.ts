import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-015.js";
import "../index.js";

describe("EX5-015 Gabumon (X Antibody)", () => {
  it("matches the catalog, printed reveal clauses, alternate costs, and inherited replacement", () => {
    expect(getCardDefinition("EX5-015")).toMatchObject({
      cardId: "EX5-015",
      nameEn: "Gabumon (X Antibody)",
      colors: ["Blue", "Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [
        { color: "Blue", level: 2, memoryCost: 1 },
        { color: "Purple", level: 2, memoryCost: 1 },
      ],
      types: ["Beast", "X Antibody"],
      effectText: expect.stringContaining("Reveal the top 4 cards of your deck"),
      inheritedEffectText: expect.stringContaining("returning 2 non-Digi-Egg cards"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Gabumon"], cost: 0, isAlternate: true },
      { names: ["Tsunomon"], cost: 0, isAlternate: true },
    ]);
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    for (const effect of compiled.effects?.filter(
      (entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving",
    ) ?? []) {
      expect(effect.actions).toMatchObject([
        {
          kind: "RevealAdd",
          revealCount: 4,
          rest: "deckBottom",
          add: [
            { count: 2, to: "hand", filter: { nameOrTrait: [{ match: "name", tokens: ["Garurumon", "X Antibody"] }] } },
          ],
        },
        { kind: "Trash", condition: { kind: "ifThisEffectActed", raw: "you added cards" } },
      ]);
    }
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "byBattle",
          outcome: "preventDeletion",
          cost: { kind: "return", target: { filter: { excludeKind: ["DigiEgg"] }, count: 2, to: "deckBottom" } },
        },
      ],
    });
  });

  it("uses a public On Play to add the sole match and preserve ordered remainder (Q3552)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-015", as: "gabumonX" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          deck: [
            { card: "BT1-036", as: "garurumon" },
            { card: "BT1-010", as: "firstRemainder" },
            { card: "BT1-011", as: "secondRemainder" },
            { card: "BT1-012", as: "thirdRemainder" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-036");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011", "BT1-012"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("adds every matching card in the reveal, including the X Antibody-name bucket (Q3553/Q3554)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-015", as: "gabumonX" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          deck: [
            { card: "BT1-036", as: "firstGarurumon" },
            { card: "EX5-018", as: "secondGarurumon" },
            { card: "BT9-109", as: "xAntibody" },
            { card: "BT1-010", as: "remainder" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-036", "EX5-018"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT9-109", "BT1-010"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("adds both buckets when one Garurumon and one X Antibody-name card match (Q3553)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX5-015", as: "gabumonX" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          deck: [
            { card: "BT1-036", as: "garurumon" },
            { card: "BT9-109", as: "xAntibody" },
            { card: "BT1-010", as: "firstRemainder" },
            { card: "BT1-011", as: "secondRemainder" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gabumonX").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length === 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-036", "BT9-109"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("resolves the same reveal and conditional trash through a public 0-cost Gabumon evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "gabumon" }],
          hand: [
            { card: "EX5-015", as: "gabumonX" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          deck: [
            { card: "BT1-013", as: "digivolutionDraw" },
            { card: "BT1-036", as: "garurumon" },
            { card: "BT1-010", as: "firstRemainder" },
            { card: "BT1-011", as: "secondRemainder" },
            { card: "BT1-012", as: "thirdRemainder" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("sacrifice").instanceId);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gabumon").permanentId,
        instanceId: s.inst("gabumonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("gabumon").topCard?.cardId === "EX5-015" &&
        s.state.players[0]!.trash.length === 1 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(10);
    expect(s.perm("gabumon").stack.map((card) => card.cardId)).toEqual(["BT1-029"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-036"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011", "BT1-012"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("prevents one public battle deletion, then spends Once Per Turn on the second attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-036", as: "host", suspended: true, under: ["EX5-015"] }],
          trash: ["BT1-009", "BT1-010"],
          deck: ["BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker", dp: 6000 },
            { card: "BT1-010", as: "secondAttacker", dp: 6000 },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-009", "BT1-010"]);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId),
    ).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX5-015")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects an illegal level source without changing memory or stack", async () => {
    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "wrongLevel" }], hand: [{ card: "EX5-015", as: "gabumonX" }] },
    });
    await illegal.ready();
    illegal.state.memory = 10;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongLevel").permanentId,
        instanceId: illegal.inst("gabumonX").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.state.memory).toBe(10);
    expect(illegal.perm("wrongLevel").topCard?.cardId).toBe("BT1-009");
  });
});
