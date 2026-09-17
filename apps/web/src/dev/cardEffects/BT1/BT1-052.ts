import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function seasarmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const seasarmon = permanent("demo-seasarmon", "BT1-052", 0, 4000);
  opponent.handCount = 5;
  if (effect === "security-battle") {
    seasarmon.isSuspended = true;
    you.battleArea.push(seasarmon);
    opponent.securityCount = 4;
    opponent.trash.push(card("demo-seasarmon-security", "BT1-080", 1));
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "BT1-052",
          effectKey: "BT1-052/jamming",
          description: "Jamming prevented Seasarmon from being deleted in the security battle.",
          timing: "Static",
        },
      ],
    };
  }

  you.battleArea.push(seasarmon);
  state.players.push(you, opponent);
  return { state };
}
