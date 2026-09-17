import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function exVeemonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-bt3-025-host", "BT3-025", 0, 4000);
  const target = permanent("demo-bt3-025-target", "BT2-024", 0, 4000);
  target.isSuspended = effect === "suspended";
  you.battleArea.push(host, target);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-025",
        effectKey: `BT3-025/${effect ?? "resolved"}`,
        description: "ExVeemon unsuspended one of its owner's level 4 or lower Digimon.",
        timing: "WhenDigivolving",
      },
    ],
  };
}
