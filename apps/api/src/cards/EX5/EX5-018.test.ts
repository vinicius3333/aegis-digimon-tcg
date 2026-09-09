import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-018.js";
import "../index.js";

describe("EX5-018 Garurumon (X Antibody)", () => {
  it("matches the catalog and encodes the draw/trash, stack-name, and replacement clauses", () => {
    expect(getCardDefinition("EX5-018")).toMatchObject({
      cardId: "EX5-018",
      nameEn: "Garurumon (X Antibody)",
      colors: ["Blue", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      types: ["Beast", "X Antibody"],
      effectText: expect.stringContaining("Draw 2 cards from your deck"),
      inheritedEffectText: expect.stringContaining("returning 2 non-Digi-Egg cards"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 2 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
      {
        kind: "GainMemory",
        amount: 1,
        condition: {
          kind: "selfDigivolutionStackHasTrait",
          filter: {
            nameOrTrait: [
              { match: "nameExact", tokens: ["Garurumon"] },
              { match: "trait", tokens: ["X Antibody"] },
            ],
          },
        },
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "byBattle",
          sourceFilter: {
            kind: ["Digimon"],
            nameOrTrait: [{ match: "name", tokens: ["Garurumon", "Omnimon"] }],
          },
          outcome: "preventDeletion",
          cost: {
            kind: "return",
            target: { filter: { excludeKind: ["DigiEgg"] }, count: 2, to: "deckBottom" },
          },
        },
      ],
    });
  });

  it("publicly draws two, trashes two, and gains one memory through a legal stacked evolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "gabumon" }],
          hand: [
            { card: "EX5-015", as: "xRookie" },
            { card: "EX5-018", as: "garurumonX" },
            { card: "BT1-009", as: "trashA" },
            { card: "BT1-010", as: "trashB" },
            { card: "BT1-011", as: "handSpareA" },
            { card: "BT1-012", as: "handSpareB" },
          ],
          deck: [
            { card: "BT1-013", as: "firstDraw" },
            { card: "BT1-014", as: "secondDraw" },
            { card: "BT1-009", as: "revealOne" },
            { card: "BT1-010", as: "revealTwo" },
            { card: "BT1-011", as: "revealThree" },
            { card: "BT1-012", as: "revealFour" },
            { card: "BT1-013", as: "spareDeckA" },
            { card: "BT1-014", as: "spareDeckB" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("trashA").instanceId, s.inst("trashB").instanceId);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gabumon").permanentId,
        instanceId: s.inst("xRookie").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gabumon").topCard?.cardId === "EX5-015");
    expect(s.state.memory).toBe(10);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gabumon").permanentId,
        instanceId: s.inst("garurumonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("gabumon").topCard?.cardId === "EX5-018" &&
        s.state.players[0]!.trash.length === 2 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(8);
    expect(s.perm("gabumon").stack.map((card) => card.cardId)).toEqual(["BT1-029", "EX5-015"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not gain the stack memory when the public evolution has no matching name in its sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "gabumon" }],
          hand: [
            { card: "EX5-018", as: "garurumonX" },
            { card: "BT1-009", as: "trashA" },
            { card: "BT1-010", as: "trashB" },
            { card: "BT1-011", as: "handSpareA" },
            { card: "BT1-012", as: "handSpareB" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gabumon").permanentId,
        instanceId: s.inst("garurumonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("gabumon").topCard?.cardId === "EX5-018" &&
        s.state.players[0]!.trash.length === 2 &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(7);
    expect(s.perm("gabumon").stack.map((card) => card.cardId)).toEqual(["BT1-029"]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("prevents public battle deletion by returning exactly two non-Digi-Egg trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "host", suspended: true, under: ["EX5-018", "BT1-029"] }],
          trash: ["BT1-009", "BT1-010"],
          deck: ["BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("host").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-009", "BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot pay the replacement and then allow deletion when only one eligible trash card exists (Q3562)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "host", suspended: true, under: ["EX5-018", "BT1-029"] }],
          trash: ["BT1-009"],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 8000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("host").permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("spends the inherited Once Per Turn use on the first public battle and deletes on the second", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "host", suspended: true, under: ["EX5-018", "BT1-029"] }],
          trash: ["BT1-009", "BT1-010"],
          deck: ["BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstAttacker", dp: 8000 },
            { card: "BT1-010", as: "secondAttacker", dp: 8000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("host").permanentId)).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("host").permanentId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-009", "BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resets the inherited replacement through the real next-own-turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-040", as: "host", suspended: true, under: ["EX5-018", "BT1-029"] }],
          trash: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attacker", dp: 8000 },
            { card: "BT1-010", as: "attackerNext", dp: 8000 },
          ],
          hand: [{ card: "P-131", as: "suspender" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("host").permanentId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerNext").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("host").permanentId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual([
      "BT1-012",
      "BT1-013",
      "BT1-014",
      "BT1-009",
      "BT1-010",
      "BT1-011",
      "BT1-012",
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    void loop;
  });
});
