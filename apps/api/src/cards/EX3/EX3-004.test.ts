import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX3-004.js";

describe("EX3-004 Veemon", () => {
  it("matches its official identity and complete text", () => {
    expect(getCardDefinition("EX3-004")).toMatchObject({
      cardId: "EX3-004",
      nameEn: "Veemon",
      colors: ["Red"],
      level: 3,
      playCost: 3,
      dp: 1000,
      attributes: ["Free"],
      types: ["Mini Dragon"],
      evoCosts: [
        { color: "Red", level: 2, memoryCost: 0 },
        { color: "Purple", level: 2, memoryCost: 0 },
      ],
      imageId: "EX3-004",
    });
    expect(getCardDefinition("EX3-004")!.effectText).toContain("Imperialdramon");
    expect(getCardDefinition("EX3-004")!.inheritedEffectText).toContain("purple Digimon");
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 2,
              optional: true,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    zone: "hand",
                    controller: "mine",
                    nameOrTrait: [
                      { tokens: ["Imperialdramon"], match: "name" },
                      { tokens: ["Free"], match: "trait" },
                    ],
                  },
                  count: 1,
                },
              },
            },
          ],
        },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Aura",
              effect: { kind: "modifyDP", amount: 2000 },
              while: {
                kind: "youHave",
                filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], colors: ["Purple"] },
              },
            },
          ],
          isInherited: true,
        },
      ],
    });
  });
  it("trashes a Free card from hand to draw 2 on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX3-004", as: "veemon" },
            { card: "EX3-008", as: "cost" },
            { card: "EX3-063", as: "imperialdramonCost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.memory).toBe(7);
    const selection = s.decisions.find(({ req }) => req.kind === "selectCards")?.req;
    expect(selection).toMatchObject({ sourceCardId: "EX3-004", options: { timing: "OnPlay", min: 1, max: 1 } });
    expect(selection?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("cost").instanceId, s.inst("imperialdramonCost").instanceId]),
    );
  });

  it("may decline without trashing or drawing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX3-004", as: "veemon" },
            { card: "EX3-008", as: "cost" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-004"));
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it.each([0, 1, 2])("draws only the available cards from a %i-card deck after paying", async (deckSize) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX3-004", as: "veemon" },
            { card: "EX3-008", as: "cost" },
          ],
          deck: Array.from({ length: deckSize }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX3-004"));
    expect(s.state.players[0]!.hand).toHaveLength(deckSize);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("gives its carrier +2000 DP during its turn while a purple Digimon is in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["EX3-004"], as: "carrier" }, "BT2-067"] },
    });
    const carrier = s.perm("carrier");
    const baseDP = carrier.currentDP;
    await s.engine.recomputeContinuousEffects();

    expect(carrier.currentDP).toBe(baseDP + 2000);
  });

  it("does not apply for an opponent's purple Digimon or during the opponent's turn, and lapses when support leaves", async () => {
    const noOwnPurple = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["EX3-004"], as: "carrier" }] },
      1: { battleArea: ["BT2-067"] },
    });
    await noOwnPurple.ready();
    expect(noOwnPurple.perm("carrier").currentDP).toBe(noOwnPurple.perm("carrier").baseDP);

    const opponentTurn = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-010", under: ["EX3-004"], as: "carrier" },
          { card: "BT2-067", as: "purple" },
        ],
      },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    expect(opponentTurn.perm("carrier").currentDP).toBe(opponentTurn.perm("carrier").baseDP);

    opponentTurn.state.turnSeat = 0;
    await opponentTurn.ready();
    expect(opponentTurn.perm("carrier").currentDP).toBe(opponentTurn.perm("carrier").baseDP + 2000);
    await advance(opponentTurn.engine).verb.deletePermanent([opponentTurn.perm("purple").permanentId], "byEffect");
    expect(opponentTurn.perm("carrier").currentDP).toBe(opponentTurn.perm("carrier").baseDP);
  });

  it("requires an own purple Digimon, not a purple Tamer, for the inherited bonus", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", under: ["EX3-004"], as: "carrier" }, "BT2-090"] },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("carrier").currentDP).toBe(s.perm("carrier").baseDP);
  });

  it.each([
    ["red", "BT1-001"],
    ["purple", "BT10-006"],
  ] as const)("digivolves from a %s level-2 source for the printed zero cost", async (_color, egg) => {
    const s = setupEngine({
      0: {
        breeding: { card: egg, as: "egg" },
        hand: [{ card: "EX3-004", as: "veemon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("veemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard.cardId === "EX3-004");
    expect(s.state.players[0]!.breeding?.stack.map(({ cardId }) => cardId)).toEqual([egg]);
    expect(s.state.memory).toBe(0);
  });

  it("rejects an illegal yellow level-2 source and leaves the card in hand", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-005", as: "yellowEgg" },
        hand: [{ card: "EX3-004", as: "veemon" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowEgg").permanentId,
        instanceId: s.inst("veemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT1-005");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("veemon").instanceId);
  });

  it("retains the inherited source through a public evolution and breeding move", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-001", as: "egg" },
        hand: [
          { card: "EX3-004", as: "veemon" },
          { card: "BT1-014", as: "top" },
        ],
        battleArea: [{ card: "BT2-067", as: "purple" }],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("veemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "EX3-004");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("top").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT1-014");
    expect(s.perm("egg").stack.map(({ cardId }) => cardId)).toEqual(["BT1-001", "EX3-004"]);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === s.perm("egg").permanentId),
    );

    s.state.phase = Phase.Main;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("egg").currentDP).toBe(s.perm("egg").baseDP + 2000);
    expect(s.state.memory).toBe(0);
  });
});
