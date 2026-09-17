import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function darcmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const darcmon = permanent("demo-darcmon", "BT1-053", 0, 4000);
  darcmon.isSuspended = true;
  you.battleArea.push(darcmon);
  opponent.handCount = 5;
  if (effect === "effect-play-draw") {
    you.battleArea.push(permanent("demo-tinkermon", "BT1-047", 0, 3000));
    you.hand.push(card("demo-darcmon-draw", "BT1-010", 0));
    you.handCount = 1;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "BT1-053",
          effectKey: "BT1-053/yellow-rookie-draw",
          description: "Darcmon drew 1 after Tinkermon was played by an effect.",
          timing: "YourTurn",
        },
        { kind: "cardsMoved", instanceIds: ["demo-darcmon-draw"], from: "deck", to: "hand" },
      ],
    };
  }

  state.players.push(you, opponent);
  return { state };
}
