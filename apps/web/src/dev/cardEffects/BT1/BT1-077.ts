import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function okuwamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "battle-win" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-okuwamon-host", "BT1-081", 0, 10000, [
    { instanceId: "demo-okuwamon-source", cardId: "BT1-077" },
  ]);
  attacker.isSuspended = effect === "battle-win";
  you.battleArea.push(attacker);
  if (effect === "battle-win") opponent.trash.push(card("demo-okuwamon-defender", "BT1-016", 1));
  else opponent.battleArea.push(permanent("demo-okuwamon-defender", "BT1-016", 1, 1000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "battle-win") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-077",
        effectKey: "BT1-077/battle-memory",
        description: "Okuwamon's inherited effect gained 1 memory after its Digimon won the battle and survived.",
        timing: "After Battle",
      },
    ],
  };
}
