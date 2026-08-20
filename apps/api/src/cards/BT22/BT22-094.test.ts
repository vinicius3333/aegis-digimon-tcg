import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-094.js";

describe("BT22-094 Yuugo Kamishiro", () => {
  it("reveals three cards and adds one CS card to hand", () => {
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
          },
          count: 1,
          to: "hand",
        },
      ],
      rest: "deckBottom",
    });
  });

  it("reduces play cost for your CS Digimon or Tamers by returning itself", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon", "Tamer"],
        nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
      },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 2,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: { filter: { isSelfRef: true }, isSelf: true },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
  });

  it("plays itself from security without paying its cost", () => {
    const security = compiled.effects.find((effect) => effect.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      target: { filter: { isSelfRef: true }, isSelf: true, count: 1 },
    });
  });

  it("reveals a mixed deck and adds only the CS card through a public play intent", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT22-094", as: "yuugo" }], deck: ["BT1-001", "BT1-002", "BT22-054"] } },
      { autoSelectCards: true },
    );
    const yuugoId = s.inst("yuugo").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: yuugoId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT22-054"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-054")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(false);
  });
});
