import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function tentomonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-tentomon-host", "BT1-068", 0, 5000, [
    { instanceId: "demo-tentomon-source", cardId: "BT1-066" },
  ]);
  const target = permanent("demo-tentomon-target", "BT1-016", 1, 3000);
  if (effect === "target-suspended") {
    attacker.isSuspended = true;
    target.isSuspended = true;
  }
  you.battleArea.push(attacker);
  opponent.battleArea.push(target);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "target-suspended") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-066",
        effectKey: "BT1-066/suspend",
        description: "Tentomon's inherited effect suspended the opposing 3000 DP Digimon.",
        timing: "WhenAttacking",
      },
    ],
  };
}
