import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function wormmonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "wormmon-opponent");
  const effectText =
    "[On Play] Reveal the top 3 cards of your deck. Add 1 purple or red card with the [Free] trait or 1 card with [Imperialdramon] in its name among them to your hand, and trash 1 such card among them. Place the rest at the bottom of your deck in any order.";

  if (effect === "inherited") {
    const host = permanent("demo-wormmon-host", "EX3-061", 0, 8000, [
      { instanceId: "demo-wormmon-source", cardId: "EX3-055" },
    ]);
    host.grantedKeywords.push("Retaliation");
    you.battleArea.push(host);
    opponent.battleArea.push(permanent("demo-wormmon-battle-target", "EX3-060", 1, 9000));
    state.players.push(you, opponent);
    return { state };
  }

  const visibleCards = [
    { instanceId: "demo-wormmon-dinobeemon", cardId: "EX3-061" },
    { instanceId: "demo-wormmon-imperialdramon", cardId: "EX3-063" },
    { instanceId: "demo-wormmon-agumon", cardId: "BT1-010" },
  ];
  if (step === "order") {
    const orderCards = [
      { instanceId: "demo-wormmon-blue-free", cardId: "BT1-027" },
      { instanceId: "demo-wormmon-blue-imperialdramon", cardId: "BT3-031" },
      { instanceId: "demo-wormmon-red-ineligible", cardId: "BT1-010" },
    ];
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-wormmon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Choose the order for the remaining cards",
        sourceCardId: "EX3-055",
        options: {
          candidateInstanceIds: orderCards.map(({ instanceId }) => instanceId),
          visibleInstanceIds: orderCards.map(({ instanceId }) => instanceId),
          visibleCards: orderCards,
          min: 3,
          max: 3,
          orderDestination: "deckBottom",
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }

  if (step === "trash") you.hand.push(card("demo-wormmon-dinobeemon", "EX3-061", 0));
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: step === "trash" ? "demo-wormmon-trash" : "demo-wormmon-hand",
      seat: 0,
      kind: "selectCards",
      promptText:
        step === "trash"
          ? "Choose 1 other eligible revealed card to trash"
          : "Choose 1 revealed purple or red Free or Imperialdramon card for your hand",
      sourceCardId: "EX3-055",
      options: {
        candidateInstanceIds:
          step === "trash"
            ? ["demo-wormmon-imperialdramon"]
            : ["demo-wormmon-dinobeemon", "demo-wormmon-imperialdramon"],
        visibleInstanceIds: visibleCards.map(({ instanceId }) => instanceId),
        visibleCards,
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText,
      },
    },
  };
}
