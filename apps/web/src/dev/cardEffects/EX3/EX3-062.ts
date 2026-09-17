import { GameState, Phase, type ServerEvent } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function warGrowlmonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "wargrowlmon-opponent");
  you.deckCount = 32;
  opponent.deckCount = 33;
  you.battleArea.push(
    permanent("demo-wargrowlmon", "EX3-062", 0, 8000, [{ instanceId: "demo-growlmon-source", cardId: "EX3-057" }]),
  );
  you.hand.push(card("demo-takato-hand", "EX2-056", 0), card("demo-guilmon-x-hand", "BT9-009", 0));
  you.trash.push(
    card("demo-guilmon-trash", "EX3-056", 0),
    card("demo-cyborg-trash", "BT1-021", 0),
    card("demo-own-mill-three", "BT1-002", 0),
    card("demo-own-old-trash-one", "BT1-004", 0),
    card("demo-own-old-trash-two", "BT1-005", 0),
  );
  opponent.trash.push(
    card("demo-opponent-mill-one", "BT1-006", 1),
    card("demo-opponent-mill-two", "BT1-007", 1),
    card("demo-opponent-mill-three", "BT1-008", 1),
  );
  if (effect === "opponent-threshold") {
    you.trash.splice(3, 2);
    opponent.trash.push(
      card("demo-opponent-old-trash-one", "BT1-009", 1),
      card("demo-opponent-old-trash-two", "BT1-010", 1),
    );
  }
  you.handCount = you.hand.length;
  state.players.push(you, opponent);
  const effectText =
    "[When Digivolving] Trash the top 3 cards of both players' decks. Then, if either player has 5 or more cards in their trash, you may play 1 Guilmon or Takato Matsuki from your hand or trash without paying the cost.";
  const events: ServerEvent[] = [
    {
      kind: "cardsMoved",
      instanceIds: [
        "demo-guilmon-trash",
        "demo-cyborg-trash",
        "demo-own-mill-three",
        "demo-opponent-mill-one",
        "demo-opponent-mill-two",
        "demo-opponent-mill-three",
      ],
      from: "deck",
      to: "trash",
    },
  ];
  if (step === "choice") {
    return {
      state,
      events,
      decision: {
        decisionId: "demo-wargrowlmon-play-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Choose Guilmon or Takato Matsuki to play",
        sourceCardId: "EX3-062",
        options: {
          candidateInstanceIds: ["demo-takato-hand", "demo-guilmon-trash"],
          visibleInstanceIds: [
            "demo-takato-hand",
            "demo-guilmon-x-hand",
            ...you.trash.map(({ instanceId }) => instanceId),
          ],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText,
        },
      },
    };
  }
  return {
    state,
    events,
    decision: {
      decisionId: "demo-wargrowlmon-optional-play",
      seat: 0,
      kind: "optional",
      promptText: "Play 1 Guilmon or Takato Matsuki for free?",
      sourceCardId: "EX3-062",
      options: { timing: "WhenDigivolving", effectText },
    },
  };
}
