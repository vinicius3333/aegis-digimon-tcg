import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function veemonBt3Demo(_effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const veemon = permanent("demo-bt3-021-veemon", "BT3-021", 0, 2000);
  veemon.keywords.push("Jamming");
  you.battleArea.push(veemon);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-021",
        effectKey: "BT3-021/jamming",
        description: "Veemon has Jamming and cannot be deleted in battles against Security Digimon.",
        timing: "Static",
      },
    ],
  };
}
