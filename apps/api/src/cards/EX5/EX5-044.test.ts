import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-044.js";
import "../index.js";

describe("EX5-044 Elecmon", () => {
  it("matches the catalog and encodes every printed clause", () => {
    expect(getCardDefinition("EX5-044")).toMatchObject({
      cardId: "EX5-044",
      nameEn: "Elecmon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 1 },
        { color: "Green", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Mammal"],
      effectText: expect.stringContaining("Reveal the top 5 cards of your deck"),
      inheritedEffectText: expect.stringContaining("De-Digivolve  1"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Frimon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toEqual([
      {
        kind: "RevealAdd",
        revealCount: 5,
        add: [
          {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Leomon"], match: "name" }],
            },
            count: 1,
            to: "hand",
          },
        ],
        rest: "deckBottom",
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.isInherited)).toEqual({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
        },
      ],
      isInherited: true,
    });
  });

  it("publicly adds the first Leomon-name match and bottoms the other four in order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-044", as: "source" }],
          deck: [
            { card: "BT1-035", as: "leomon" },
            { card: "BT1-009", as: "firstRemainder" },
            { card: "BT1-010", as: "secondRemainder" },
            { card: "BT1-011", as: "thirdRemainder" },
            { card: "BT1-012", as: "fourthRemainder" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("leomon").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("leomon").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("firstRemainder").instanceId,
      s.inst("secondRemainder").instanceId,
      s.inst("thirdRemainder").instanceId,
      s.inst("fourthRemainder").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly leaves all five cards on the bottom when no Leomon-name card is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-044", as: "source" }],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
            { card: "BT1-012", as: "fourth" },
            { card: "BT1-013", as: "fifth" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
      s.inst("third").instanceId,
      s.inst("fourth").instanceId,
      s.inst("fifth").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    { label: "Frimon alternate", base: "EX5-004", alternate: true, legal: true, cost: 0 },
    { label: "green level-2 normal", base: "BT1-007", alternate: false, legal: true, cost: 1 },
    { label: "wrong-color alternate", base: "BT1-005", alternate: true, legal: false, cost: 0 },
  ])("checks the public $label evolution route", async ({ base, alternate, legal, cost }) => {
    const s = setupEngine({
      0: {
        breeding: { card: base, as: "base" },
        hand: [{ card: "EX5-044", as: "evo" }],
        deck: [{ card: "BT1-009", as: "bonusDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: alternate,
      }).ok,
    ).toBe(legal);
    await settle();

    expect(s.perm("base").topCard?.cardId).toBe(legal ? "EX5-044" : base);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(legal ? [base] : []);
    expect(s.state.memory).toBe(legal ? 5 - cost : 5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      legal ? [s.inst("bonusDraw").instanceId] : [s.inst("evo").instanceId],
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("applies inherited De-Digivolve 1 after a public opponent battle deletes its source", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-044"], suspended: true }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "attacker", dp: 20000 },
            { card: "BT1-014", as: "target", under: ["BT1-010"] },
            { card: "BT1-014", as: "untouched", under: ["BT1-011"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();
    s.state.turnSeat = 1;
    const sourceId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: sourceId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.perm("target").stack.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-010");
    expect(s.perm("untouched").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("untouched").stack.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-014");
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
