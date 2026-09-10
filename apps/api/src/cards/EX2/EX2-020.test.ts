import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX2-020.js";
import "./EX2-059.js";

describe("EX2-020 Lopmon", () => {
  it("matches the catalog and compiles its guarded Recovery effect", () => {
    expect(getCardDefinition("EX2-020")).toMatchObject({
      cardId: "EX2-020",
      nameEn: "Lopmon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beast"],
      effectText:
        "[On Play] If you have 3 or fewer security cards and [Shu-Chong Wong] in play, ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.)",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
              condition: {
                kind: "allOf",
                conditions: [
                  {
                    kind: "zoneCount",
                    seat: "mine",
                    zone: "security",
                    op: "lte",
                    value: 3,
                    raw: "you have 3 or fewer security cards",
                  },
                  {
                    kind: "youHave",
                    filter: {
                      zone: "battleArea",
                      controllerDefault: "mine",
                      nameOrTrait: [{ tokens: ["Shu-Chong Wong"], match: "name" }],
                    },
                    raw: "[Shu-Chong Wong] in play",
                  },
                ],
                raw: "you have 3 or fewer security cards and [Shu-Chong Wong] in play",
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("recovers 1 from the deck at exactly 3 security with Shu-Chong Wong in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-059"],
          hand: [{ card: "EX2-020", as: "lopmon" }],
          deck: [{ card: "BT1-009", as: "recovered" }, "BT1-010"],
          security: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 4);

    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovered").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("does not recover when security is above three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-059"],
          hand: [{ card: "EX2-020", as: "lopmon" }],
          deck: [{ card: "BT1-009", as: "deckTop" }, "BT1-010"],
          security: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-020"));

    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
  });

  it("does not recover at three security without Shu-Chong Wong", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX2-020", as: "lopmon" }],
          deck: [{ card: "BT1-009", as: "deckTop" }, "BT1-010"],
          security: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX2-020"));

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
  });

  it("supports a legal yellow Digi-Egg evolution in the public breeding flow", async () => {
    const s = setupEngine({
      0: {
        eggDeck: [{ card: "BT1-005", as: "egg" }],
        hand: [{ card: "EX2-020", as: "evolution" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }, "BT1-010"],
        security: ["BT1-011"],
      },
      1: {
        deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017"],
        security: ["BT1-018"],
      },
    });
    s.state.memory = 2;
    const turnLoop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);

    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-005");
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("evolution").instanceId);

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolutionDraw").instanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });

  it("rejects evolution from a non-yellow level-2 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "EX2-020", as: "evolution" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evolution").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
