import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function labramonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-labramon-host", "BT1-052", 0, 4000, [{ instanceId: "demo-labramon-source", cardId: "BT1-049" }]),
  );
  opponent.handCount = 5;

  if (effect === "dp-zero") {
    you.hand.push(card("demo-labramon-draw", "BT1-010", 0));
    you.handCount = 1;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "cardsMoved", instanceIds: ["demo-opponent-target-top"], from: "battleArea", to: "trash" },
        { kind: "cardsMoved", instanceIds: ["demo-labramon-draw"], from: "deck", to: "hand" },
      ],
    };
  }

  opponent.battleArea.push(permanent("demo-opponent-target", "BT1-016", 1, 2000));
  state.players.push(you, opponent);
  return { state };
}
