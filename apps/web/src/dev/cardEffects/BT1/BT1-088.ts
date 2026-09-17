import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function izzyIzumiDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[Main] If you have a level 5 or higher green Digimon in play, you can suspend this Tamer to reveal the top card of your deck. If that card is a Digimon card, add it to your hand. Otherwise place it at the bottom of your deck.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const izzy = permanent("demo-izzy-izumi", "BT1-088", 0, 0);
  izzy.isSuspended = effect === "digimon-added" || effect === "non-digimon-bottom";
  you.battleArea.push(izzy);
  you.battleArea.push(permanent("demo-izzy-qualifier", effect === "ineligible" ? "BT1-070" : "BT1-078", 0, 7000));
  you.deckCount = effect === "digimon-added" ? 34 : 35;
  if (effect === "digimon-added") {
    you.hand.push(card("demo-izzy-revealed-digimon", "BT1-077", 0));
    you.handCount = 1;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    return {
      state,
      decision: {
        decisionId: "demo-izzy-activate",
        seat: 0,
        kind: "optional",
        promptText: "Suspend Izzy Izumi to reveal the top card of your deck?",
        sourceCardId: "BT1-088",
        options: { timing: "Main", effectText },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "digimon-added": "Izzy Izumi suspended, revealed Okuwamon, and added the Digimon card to hand.",
    "non-digimon-bottom": "Izzy Izumi suspended and placed the revealed non-Digimon card at the bottom of the deck.",
    "security-play": "Izzy Izumi was played from security without paying the cost.",
  };
  return {
    state,
    events: [
      effect === "security-play"
        ? { kind: "cardsMoved", instanceIds: [izzy.topCard.instanceId], from: "security", to: "battleArea" }
        : {
            kind: "effectTriggered",
            seat: 0,
            sourceCardId: "BT1-088",
            effectKey: "BT1-088/reveal",
            description: descriptions[effect] ?? effectText,
            timing: "Main",
          },
    ],
  };
}
