import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-062.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver) {
    const first = s.engine.applyIntent(seat, { type: "surrender" });
    const second = first.ok ? first : s.engine.applyIntent(seat === 0 ? 1 : 0, { type: "surrender" });
    if (!second.ok) throw new Error("failed to stop turn loop");
  }
  await loop;
}

describe("EX7-062 HeavyMetaldramon", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-062")).toMatchObject({
      cardId: "EX7-062",
      nameEn: "HeavyMetaldramon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 5 },
        { color: "Red", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Evil Dragon", "LIBERATOR"],
    });
    expect(digivolutionRequirementsFor("EX7-062")).toContainEqual({
      level: 5,
      traits: ["Dark Dragon", "Evil Dragon"],
      cost: 4,
      isAlternate: true,
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "WhenDigivolving",
        actions: [
          { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
          {
            kind: "Delete",
            target: {
              count: 1,
              filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
            },
          },
        ],
      },
      {
        trigger: "EndOfYourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["trash"],
            payCost: false,
            optional: true,
            target: {
              count: 1,
              filter: {
                playCostLte: 8,
                playCostLteScaling: { per: 1, unit: "cards", subtract: 1 },
                nameOrTrait: [{ tokens: ["Evil", "Dark Dragon", "Evil Dragon"], match: "trait" }],
              },
            },
          },
        ],
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-062")).toBe(true);
  });

  it.each([
    ["Dark Dragon", "EX7-056"],
    ["Evil Dragon", "BT21-077"],
  ])("alternate-evolves from a %s level 5, trashes exactly two cards, and deletes at its DP", async (_trait, base) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [
            { card: "EX7-062", as: "heavy" },
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-010", as: "secondCost" },
          ],
          deck: [{ card: "BT1-014", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "within", dp: 13000 },
            { card: "BT1-010", as: "above", dp: 13001 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("firstCost").instanceId, s.inst("secondCost").instanceId, s.inst("within").instanceId);
    s.state.memory = 5;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("heavy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("within").instanceId),
    );
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("firstCost").instanceId, s.inst("secondCost").instanceId]),
    );
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("above").instanceId,
    ]);
  });

  it.each([
    ["Purple", "EX7-056"],
    ["Red", "BT1-021"],
  ])("uses the standard %s level-5 route for exactly 5 memory", async (_color, base) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [{ card: "EX7-062", as: "heavy" }, "BT1-009", "BT1-010"],
          deck: [{ card: "BT1-014", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("heavy").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-062" && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("rejects an off-color level 5 without either alternate trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-022", as: "base" }],
        hand: [{ card: "EX7-062", as: "heavy" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("heavy").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
  });

  it.each([
    ["Evil", "EX7-050", 5],
    ["Dark Dragon", "EX7-055", 2],
    ["Evil Dragon", "BT11-079", 3],
  ])("plays the %s trait at the hand-reduced exact cost ceiling", async (_trait, candidate, handCount) => {
    const hand = Array.from({ length: handCount }, (_, index) => (index % 2 === 0 ? "BT1-009" : "BT1-010"));
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-062", as: "heavy" }],
          hand,
          trash: [{ card: candidate, as: "candidate" }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-009"], hand: ["BT1-009"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("candidate").instanceId),
    ).toBe(true);
  });

  it("does not offer a card above the hand-reduced cost ceiling", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-062", as: "heavy" }],
        hand: ["BT1-009", "BT1-010"],
        trash: [{ card: "EX7-057", as: "candidate" }],
        deck: ["BT1-009"],
        security: ["BT1-009"],
      },
      1: { deck: ["BT1-009"], hand: ["BT1-009"], security: ["BT1-010"] },
    });
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX7-057")).toBe(true);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("does not play a cost-eligible card without a matching trait", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-062", as: "heavy" }],
        hand: ["BT1-009"],
        trash: [{ card: "BT10-022", as: "candidate" }],
        deck: ["BT1-009"],
        security: ["BT1-009"],
      },
      1: { deck: ["BT1-009"], hand: ["BT1-009"], security: ["BT1-010"] },
    });
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("candidate").instanceId)).toBe(
      true,
    );
  });

  it("may decline the end-of-turn free play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-062", as: "heavy" }],
          trash: [{ card: "EX7-050", as: "candidate" }],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-009"], hand: ["BT1-009"], security: ["BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX7-050")).toBe(true);
  });

  it("rearms the end-of-turn free play on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-062", as: "heavy" }],
          trash: [
            { card: "EX7-050", as: "first" },
            { card: "BT11-079", as: "second" },
          ],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-009"], hand: ["BT1-009"], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    await stopLoop(s, loop, 1);
  });
});
