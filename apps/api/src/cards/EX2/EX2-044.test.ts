import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-044.js";
import "./EX2-044.js";
import "./EX2-040.js";
import "./EX2-039.js";
import "./EX2-042.js";

const inertDeck = ["BT1-009", "BT1-013", "BT1-009", "BT1-013"];
const inertSecurity = ["BT1-009", "BT1-013", "BT1-009"];

describe("EX2-044 Beelzemon", () => {
  it("matches the catalog, Q&A, and compiled triggers, ceiling, and Impmon filter", () => {
    expect(getCardDefinition("EX2-044")).toMatchObject({
      cardId: "EX2-044",
      nameEn: "Beelzemon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Purple", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords"],
      rarity: "SR",
      maxCountInDeck: 4,
      effectText:
        "When this card is trashed from your deck, you may play 1 [Impmon] from your trash without paying its memory cost.[When Digivolving][When Attacking] You may trash the top 2 cards of your deck. Then, delete 1 of your opponent's level 3 or lower Digimon. For every 10 cards in your trash, add 1 to the maximum level of the Digimon you can choose with this effect.",
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "AllTurns",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenTrashedFromDeck",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "PlayWithoutCost",
                  from: ["trash"],
                  payCost: false,
                  optional: true,
                  target: {
                    count: 1,
                    filter: {
                      controller: "mine",
                      zone: "trash",
                      nameOrTrait: [{ tokens: ["Impmon"], match: "name" }],
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          trigger: "WhenDigivolving",
          actions: [
            { kind: "TrashTopDeck", controller: "mine", amount: 2, optional: true, abortOnDecline: true },
            {
              kind: "Delete",
              target: {
                count: 1,
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 3 },
                },
              },
              scaling: { per: 10, unit: "trash", levelCeilingAdd: 1 },
            },
          ],
        },
        {
          trigger: "WhenAttacking",
          actions: [
            { kind: "TrashTopDeck", controller: "mine", amount: 2, optional: true, abortOnDecline: true },
            {
              kind: "Delete",
              target: {
                count: 1,
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 3 },
                },
              },
              scaling: { per: 10, unit: "trash", levelCeilingAdd: 1 },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("raises its deletion level by 1 for every 10 cards in trash", async () => {
    const trash = Array.from({ length: 8 }, () => "BT1-009");
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }],
          hand: [{ card: "EX2-044", as: "beelzemon" }],
          deck: [...inertDeck],
          trash,
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "EX2-015", as: "levelFour" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 8;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.length).toBe(10);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").topCard?.cardId).toBe("EX2-044");
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX2-042"]);
    expect(s.state.memory).toBe(5);
  });

  it("keeps the deletion ceiling at level 3 below ten cards in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }],
          hand: [{ card: "EX2-044", as: "beelzemon" }],
          deck: [...inertDeck],
          trash: Array.from({ length: 7 }, () => "BT1-009"),
          security: inertSecurity,
        },
        1: { battleArea: [{ card: "EX2-015", as: "levelFour" }], deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 8;
    const targetId = s.perm("levelFour").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length >= 9);
    expect(s.state.players[0]!.trash.length).toBe(9);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(true);
  });

  it("may play an Impmon from trash when directly trashed from the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-043", as: "attacker", under: ["EX2-040"] }],
          deck: [
            { card: "EX2-044", as: "beelzemon" },
            { card: "BT1-009", as: "filler" },
          ],
          security: inertSecurity,
          trash: [{ card: "EX2-039", as: "impmon" }],
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX2-044"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-039")).toBe(true);
  });

  it("does not trash or delete when the optional attack effect is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-044", as: "beelzemon" }], deck: [...inertDeck], security: inertSecurity },
        1: { battleArea: [{ card: "EX2-019", as: "target" }], deck: inertDeck, security: inertSecurity },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    const deckBeforeAttack = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beelzemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const optionalDecision = s.decisions.find(({ req }) => req.kind === "optional");
    expect(optionalDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optionalDecision!.req.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBeforeAttack);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not trigger when Beelzemon is only revealed by another effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-039", as: "playedImpmon" }],
          deck: [
            { card: "EX2-044", as: "revealedBeelzemon" },
            { card: "EX2-065", as: "aiMako" },
            { card: "BT1-009", as: "fillerOne" },
            { card: "BT1-013", as: "fillerTwo" },
          ],
          security: inertSecurity,
          trash: [{ card: "EX2-039", as: "trashImpmon" }],
        },
        1: { deck: inertDeck, security: inertSecurity },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedImpmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealedBeelzemon").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("revealedBeelzemon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("trashImpmon").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("rejects a non-purple level-5 evolution source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "wrongSource" }],
        hand: [{ card: "EX2-044", as: "beelzemon" }],
        deck: inertDeck,
        security: inertSecurity,
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
