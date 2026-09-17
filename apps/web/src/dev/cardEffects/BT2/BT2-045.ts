import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function argomonChampionBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "accepted" ? 3 : 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-argomon-champion-bt2", "BT2-045", 0, 5000),
    permanent("demo-argomon-champion-bt2-cost", "BT1-010", 0, 3000),
  );
  if (effect === "accepted") you.battleArea[1]!.isSuspended = true;
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-045",
        effectKey: "BT2-045/digisorption",
        description:
          effect === "accepted"
            ? "Digisorption -2 suspended an allied Digimon and reduced Argomon's 2-memory digivolution cost to 0."
            : "Digisorption was declined or unavailable, so Argomon paid its full 2-memory digivolution cost.",
        timing: "When Digivolving",
      },
    ],
  };
}
