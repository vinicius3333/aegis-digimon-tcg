import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function liamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "reduced-after-memory-drop" ? 1 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const liamon = permanent("demo-liamon", "BT1-054", 0, 4000);
  const target = permanent("demo-liamon-target", "BT1-016", 1, effect === "reduced-after-memory-drop" ? 3000 : 5000);
  if (effect === "reduced-after-memory-drop") liamon.isSuspended = true;
  you.battleArea.push(liamon);
  opponent.battleArea.push(target);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "reduced-after-memory-drop") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-054",
        effectKey: "BT1-054/dp-minus",
        description: "Liamon's -2000 DP remains active after memory dropped below 3.",
        timing: "WhenAttacking",
      },
    ],
  };
}
