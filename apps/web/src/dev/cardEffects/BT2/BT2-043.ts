import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function agumonGreenBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponents-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-agumon-green-bt2-host", "BT2-045", 0, effect === "opponents-turn" ? 3000 : 4000, [
      { instanceId: "demo-agumon-green-bt2-source", cardId: "BT2-043" },
    ]),
  );
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-043",
        effectKey: "BT2-043/inherited-dp-boost",
        description:
          effect === "opponents-turn"
            ? "Agumon's inherited +1000 DP is inactive during the opponent's turn, leaving the host at 3000 DP."
            : "Agumon's inherited effect gives its host +1000 DP during its controller's turn.",
        timing: "Your Turn",
      },
    ],
  };
}
