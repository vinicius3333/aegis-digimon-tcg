import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX3-004.js";

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
    });
    expect(getCardDefinition("EX3-004")!.effectText).toContain("Imperialdramon");
    expect(getCardDefinition("EX3-004")!.inheritedEffectText).toContain("purple Digimon");
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
});
