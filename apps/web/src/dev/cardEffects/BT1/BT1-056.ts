import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function petermonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "tinkermon-played" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-petermon", "BT1-056", 0, 5000));
  if (effect === "tinkermon-played") {
    you.battleArea.push(permanent("demo-petermon-tinkermon", "BT1-047", 0, 3000));
  } else {
    you.trash.push(card("demo-petermon-tinkermon-card", "BT1-047", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "tinkermon-played") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-056",
        effectKey: "BT1-056/play-tinkermon",
        description: "Petermon played 1 Tinkermon from the trash without paying its memory cost.",
        timing: "OnPlay",
      },
    ],
  };
}
