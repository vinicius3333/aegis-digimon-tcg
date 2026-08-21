import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-206.js";

describe("P-206 Digimon Liberator", () => {
  it("can be used without a matching color source or a separate waiver prompt", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-206", as: "option" }],
        deck: ["BT1-009", "BT1-085", "BT1-095"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 4;
    await s.ready();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard.cardId === "P-206",
    ));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-085"]),
    );
  });

  it("reveals distinct Digimon and Tamer cards, then places itself", () => {
    expect(runtimeCompiledCard("P-206")!.effects.find((effect) => effect.trigger === "Main" && !effect.keywords?.length)).toMatchObject({
      actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1, to: "hand", filter: { kind: ["Digimon"] } }, { count: 1, to: "hand", filter: { kind: ["Tamer"] } }] }, { kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("delays same-color Tamer play and offers a low-cost Security play followed by recovery", () => {
    const card = runtimeCompiledCard("P-206")!;
    expect(card.effects.find((effect) => effect.trigger === "Main" && effect.keywords?.length)).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCost: 4, target: { count: 1, filter: { kind: ["Tamer"], sameColorAsAnyOfYourDigimon: true } } }],
    });
    expect(card.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", optional: true, from: ["hand", "trash"], payCost: false, target: { count: 1, filter: { kind: ["Digimon"], playCostLte: 3 } } }, { kind: "AddToHandSelf" }],
    });
  });
});
