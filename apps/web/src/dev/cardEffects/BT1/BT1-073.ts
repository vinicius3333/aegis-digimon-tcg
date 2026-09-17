import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function kabuterimonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "active" ? 0 : 1;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-kabuterimon-host", "BT1-075", 0, effect === "active" ? 9000 : 7000, [
      { instanceId: "demo-kabuterimon-source", cardId: "BT1-073" },
    ]),
  );
  const targetA = permanent("demo-kabuterimon-target-a", "BT1-016", 1, 5000);
  const targetB = permanent("demo-kabuterimon-target-b", "BT1-017", 1, 6000);
  targetA.isSuspended = true;
  targetB.isSuspended = true;
  opponent.battleArea.push(targetA, targetB);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "active") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-073",
        effectKey: "BT1-073/suspended-dp",
        description: "Kabuterimon's inherited effect gives +2000 DP for 2 suspended opposing Digimon.",
        timing: "Static",
      },
    ],
  };
}
