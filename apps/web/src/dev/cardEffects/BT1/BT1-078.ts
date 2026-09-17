import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function jagamonDemo(step: string | null): CardEffectsFixture {
  const effectText =
    "[When Attacking] Reveal 3 cards from the top of your deck. You can digivolve this card into 1 level 6 green Digimon card among them without paying its memory cost. Place the remaining cards at the bottom of your deck in any order.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const evolved = step === "order" || step === "resolved";
  const attacker = permanent("demo-jagamon", evolved ? "BT1-081" : "BT1-078", 0, evolved ? 11000 : 7000, [
    ...(evolved ? [{ instanceId: "demo-jagamon-source", cardId: "BT1-078" }] : []),
  ]);
  attacker.isSuspended = true;
  you.battleArea.push(attacker);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const revealed = [
    { instanceId: "demo-jagamon-green-level-six", cardId: "BT1-081" },
    { instanceId: "demo-jagamon-miss-a", cardId: "BT1-010" },
    { instanceId: "demo-jagamon-miss-b", cardId: "BT1-011" },
  ];
  if (step === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "BT1-078",
          effectKey: "BT1-078/reveal-digivolve",
          description: "Jagamon digivolved into a revealed green level 6 Digimon for free and bottom-decked the rest.",
          timing: "When Attacking",
        },
      ],
    };
  }

  const ordering = step === "order";
  const decisionCards = ordering ? revealed.slice(1) : revealed;
  return {
    state,
    decision: {
      decisionId: ordering ? "demo-jagamon-order" : "demo-jagamon-select",
      seat: 0,
      kind: ordering ? "orderCards" : "selectCards",
      promptText: ordering
        ? "Choose the order for the remaining cards at the bottom of the deck."
        : "You may choose 1 green level 6 Digimon to digivolve into for free.",
      sourceCardId: "BT1-078",
      options: {
        candidateInstanceIds: ordering
          ? revealed.slice(1).map(({ instanceId }) => instanceId)
          : [revealed[0]!.instanceId],
        visibleInstanceIds: decisionCards.map(({ instanceId }) => instanceId),
        visibleCards: decisionCards,
        min: ordering ? 2 : 0,
        max: ordering ? 2 : 1,
        ...(ordering ? { orderDestination: "deckBottom" as const } : {}),
        timing: "WhenAttacking",
        effectText,
      },
    },
  };
}
