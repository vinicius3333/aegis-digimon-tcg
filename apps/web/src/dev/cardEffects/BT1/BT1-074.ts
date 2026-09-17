import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function togemonDemo(step: string | null): CardEffectsFixture {
  const effectText =
    "[When Digivolving] Reveal 3 cards from the top of your deck. Add 1 level 5 or higher Digimon card among them to your hand. Place the remaining cards at the bottom of your deck in any order.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-togemon", "BT1-074", 0, 5000, [{ instanceId: "demo-togemon-base", cardId: "BT1-067" }]),
  );
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const revealed = [
    { instanceId: "demo-togemon-level-five", cardId: "BT1-075" },
    { instanceId: "demo-togemon-level-three", cardId: "BT1-068" },
    { instanceId: "demo-togemon-level-four", cardId: "BT1-069" },
  ];
  const ordering = step === "order";
  const decisionCards = ordering ? revealed.slice(1) : revealed;
  if (ordering) {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    you.handCount = 1;
  }

  return {
    state,
    decision: {
      decisionId: ordering ? "demo-togemon-order" : "demo-togemon-select",
      seat: 0,
      kind: ordering ? "orderCards" : "selectCards",
      promptText: ordering
        ? "Choose the order for the remaining cards at the bottom of the deck."
        : "Choose 1 level 5 or higher Digimon card to add to your hand.",
      sourceCardId: "BT1-074",
      options: {
        candidateInstanceIds: ordering
          ? revealed.slice(1).map(({ instanceId }) => instanceId)
          : [revealed[0]!.instanceId],
        visibleInstanceIds: decisionCards.map(({ instanceId }) => instanceId),
        visibleCards: decisionCards,
        min: ordering ? 2 : 1,
        max: ordering ? 2 : 1,
        ...(ordering ? { orderDestination: "deckBottom" as const } : {}),
        timing: "WhenDigivolving",
        effectText,
      },
    },
  };
}
