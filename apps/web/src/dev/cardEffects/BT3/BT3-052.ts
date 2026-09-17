import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function rapidmonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-bt3-052-rapidmon", "BT3-052", 0, effect === "opponent-turn" ? 6000 : 8000);
  you.battleArea.push(host);
  opponent.battleArea.push(
    permanent("demo-bt3-052-suspended-1", "BT1-019", 1, 4000),
    permanent("demo-bt3-052-suspended-2", "BT1-019", 1, 4000),
  );
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-052",
        effectKey: `BT3-052/${effect ?? "your-turn"}`,
        description:
          effect === "opponent-turn"
            ? "Rapidmon's inherited DP bonus is inactive during the opponent's turn."
            : "Rapidmon's inherited effect gives its host +1000 DP for each suspended opposing Digimon.",
        timing: "YourTurn",
      },
    ],
  };
}
