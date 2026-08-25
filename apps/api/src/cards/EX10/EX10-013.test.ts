import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import compiled from "./EX10-013.js";
import "../index.js";

describe("EX10-013 Lucemon compiled contract", () => {
  it("preserves Blocker, breeding move, exact five-card cost, and legal optional Chaos Mode digivolve", () => {
    expect(getCardDefinition("EX10-013")).toMatchObject({
      colors: ["Yellow"],
      level: 3,
      playCost: 10,
      dp: 10000,
      evoCosts: [],
      types: ["Angel"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [expect.objectContaining({ keyword: "Blocker" })] }),
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [expect.objectContaining({ keyword: "Blocker" })],
        }),
        expect.objectContaining({
          trigger: "WhenDigivolving",
          isBreeding: true,
          actions: [expect.objectContaining({ kind: "MovePermanent", direction: "toBattle", optional: true })],
        }),
        expect.objectContaining({
          trigger: "EndOfYourTurn",
          actions: [
            expect.objectContaining({
              kind: "Digivolve",
              from: ["trash"],
              payCost: false,
              optional: true,
              cost: expect.objectContaining({
                kind: "return",
                target: { filter: { controller: "mine", zone: "trash", textContains: "Lucemon" }, count: 5 },
                to: "deckBottom",
              }),
            }),
          ],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Cupimon"], cost: 5, level: 2, isAlternate: true }]);
  });

  it("digivolves from Cupimon for 5 in breeding and may move to the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX10-004", as: "cupimon" },
          hand: [{ card: "EX10-013", as: "lucemon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("cupimon").permanentId,
        instanceId: s.inst("lucemon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-013"));

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.memory).toBe(0);
    const moved = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-013")!;
    expect(moved.stack.map(({ cardId }) => cardId)).toContain("EX10-004");
    expect(observe(s.engine).hasKeyword(moved, "Blocker")).toBe(true);
  });

  it("returns exactly 5 Lucemon-text cards, evolves into a legal Chaos Mode for free, and grants inherited Blocker", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: "EX10-004", as: "cost1" },
            { card: "EX10-004", as: "cost2" },
            { card: "EX10-004", as: "cost3" },
            { card: "EX10-004", as: "cost4" },
            { card: "EX10-004", as: "cost5" },
            { card: "EX10-052", as: "chaos" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...["cost1", "cost2", "cost3", "cost4", "cost5"].map((alias) => s.inst(alias).instanceId));
    const returnedIds = [...preferred];

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("lucemon"));
    await settle(() => s.perm("lucemon").topCard.cardId === "EX10-052");

    expect(
      [
        ...s.state.players[0]!.deck,
        ...s.state.players[0]!.eggDeck,
        ...s.state.players[0]!.security,
        ...s.state.players[0]!.hand,
        ...[...s.state.players[0]!.battleArea].flatMap(({ stack }) => [...stack]),
      ].map(({ instanceId }) => instanceId),
    ).toEqual(expect.arrayContaining(returnedIds));
    expect(s.state.players[0]!.eggDeck.map(({ instanceId }) => instanceId)).toContain(s.inst("cost1").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining(returnedIds),
    );
    expect(s.perm("lucemon").stack.map(({ cardId }) => cardId)).toContain("EX10-013");
    expect(observe(s.engine).hasKeyword(s.perm("lucemon"), "Blocker")).toBe(true);
  });

  it("Q5039 cannot pay the processing condition with only 4 matching cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: ["EX10-004", "BT18-034", "BT4-115", { card: "EX10-052", as: "chaos" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const trashBefore = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("lucemon"));
    await settle();

    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(trashBefore);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("Q5041 never evolves into the requirements-ignoring hand-only BT7-111 from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-013", as: "lucemon" }],
          trash: [
            { card: "EX10-004", as: "cost1" },
            { card: "BT18-034", as: "cost2" },
            { card: "BT4-115", as: "cost3" },
            { card: "EX6-018", as: "cost4" },
            { card: "BT19-043", as: "cost5" },
            { card: "BT7-111", as: "illegalChaos" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(...["cost1", "cost2", "cost3", "cost4", "cost5"].map((alias) => s.inst(alias).instanceId));

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("lucemon"));
    await settle();

    expect(s.perm("lucemon").topCard.cardId).toBe("EX10-013");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT7-111");
  });
});
