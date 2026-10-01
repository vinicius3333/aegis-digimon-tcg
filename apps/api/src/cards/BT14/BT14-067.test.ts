import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-067.js";
import { getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-067", () => {
  it("reveals three opponent cards, chooses a Digimon budget, deletes up to that total, and returns the reveal", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "RevealChooseDeleteBudget",
        revealCount: 3,
        revealController: "opponent",
        chooseFilter: { kind: ["Digimon"] },
        upTo: true,
        returnRevealed: "deckTopOrBottom",
        returnOrder: "controllerChoice",
      });
  });
  it("uses the chosen revealed Digimon play cost as the deletion budget", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-067", as: "source" }] },
        1: {
          deck: ["BT14-039", "BT14-082", "BT14-089"],
          battleArea: [
            { card: "BT14-058", as: "cheap" },
            { card: "BT14-039", as: "expensive" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT14-058"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-058")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-039")).toBe(true);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT14-039", "BT14-082", "BT14-089"]);
  });

  it("naturally resolves the When Digivolving budget from a public evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-064", as: "base" }],
          hand: [{ card: "BT14-067", as: "evolving" }],
        },
        1: {
          deck: ["BT14-039", "BT14-082", "BT14-089"],
          battleArea: [{ card: "BT14-058", as: "cheap" }],
        },
      },
      { autoSelectCards: true, autoChooseOption: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((perm) => perm.topCard?.cardId !== "BT14-058"));

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT14-067");
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-058")).toBe(false);
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(["BT14-039", "BT14-082", "BT14-089"]);
  });
});

describe("BT14-067 Ebemon — KB Q&A rulings", () => {
  it("treats a revealed play cost of 5 as a total play cost budget of 5, not as permission to delete up to 5 Digimon (Q2439)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-067", as: "ebemon" }] },
        1: {
          deck: ["BT1-020", "BT14-082", "BT14-089"],
          battleArea: [
            { card: "BT1-009", as: "costTwo" },
            { card: "BT1-013", as: "costThreeA" },
            { card: "BT1-014", as: "costThreeB" },
            { card: "BT1-047", as: "costThreeC" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 11;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ebemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.trash.length >= 2 &&
        s.state.players[1]!.deck.length === 3 &&
        s.state.pendingDecision === undefined,
    );

    const deletedCosts = s.state.players[1]!.trash.map((card) => getCardDefinition(card.cardId)!.playCost ?? 0);
    expect(deletedCosts.sort()).toEqual([2, 3]);
    expect(deletedCosts.reduce((total, cost) => total + cost, 0)).toBeLessThanOrEqual(5);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("lets Ebemon's player, not the revealing opponent, choose the order and top or bottom of the returned cards (Q2440)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT14-067", as: "ebemon" }] },
        1: {
          deck: [
            { card: "BT1-020", as: "first" },
            { card: "BT14-082", as: "second" },
            { card: "BT14-089", as: "third" },
            { card: "BT1-013", as: "unrevealedA" },
            { card: "BT1-014", as: "unrevealedB" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 11;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ebemon").instanceId })).toEqual({
      ok: true,
    });

    const answer = async (kind: string, response: DecisionResponse) => {
      await settle(() => s.state.pendingDecision?.kind === kind);
      const pending = s.decisions.at(-1)!;
      expect(pending.seat).toBe(0);
      expect(respond(s, 1, response)).not.toEqual({ ok: true });
      expect(respond(s, 0, response)).toEqual({ ok: true });
    };
    const chosenOrder = [s.inst("third").instanceId, s.inst("first").instanceId, s.inst("second").instanceId];

    await answer("selectCards", { kind: "selectCards", instanceIds: [s.inst("first").instanceId] });
    await answer("selectCards", { kind: "selectCards", instanceIds: chosenOrder });
    await answer("chooseOption", { kind: "chooseOption", optionIndex: 1 });

    await settle(() => s.state.players[1]!.deck.length === 5 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("unrevealedA").instanceId,
      s.inst("unrevealedB").instanceId,
      ...chosenOrder,
    ]);
    expect(s.decisions.filter(({ seat }) => seat === 1)).toEqual([]);
  });
});

function respond(s: EngineSetup, seat: 0 | 1, response: DecisionResponse) {
  return s.engine.applyIntent(seat, {
    type: "respondDecision",
    decisionId: s.state.pendingDecision!.decisionId,
    response,
  });
}
