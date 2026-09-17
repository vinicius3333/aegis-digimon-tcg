import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function boringStormDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-boring-storm-blue", "BT1-028", 0, 3000));
  if (effect === null) {
    you.hand.push(card("demo-boring-storm-option", "BT1-097", 0));
    you.handCount = 1;
  } else if (effect === "main-draw") {
    you.hand.push(card("demo-boring-storm-main-draw", "BT1-029", 0));
    you.handCount = 1;
    you.deckCount = 35;
    you.trash.push(card("demo-boring-storm-option", "BT1-097", 0));
  } else {
    you.hand.push(
      card("demo-boring-storm-security-first", "BT1-029", 0),
      card("demo-boring-storm-security-second", "BT1-030", 0),
    );
    you.handCount = 2;
    you.deckCount = 34;
    you.securityCount = 4;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-097",
        effectKey: effect === "main-draw" ? "BT1-097/main-draw" : "BT1-097/security-draw",
        description:
          effect === "main-draw"
            ? "Boring Storm drew exactly the top card, then the used Option went to trash."
            : "Boring Storm's Security effect drew exactly 2 cards without adding Boring Storm to hand.",
        timing: effect === "main-draw" ? "Main" : "Security",
      },
    ],
  };
}
