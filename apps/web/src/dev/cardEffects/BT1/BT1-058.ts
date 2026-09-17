import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function chirinmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "loan-repaid-after-deletion" ? -6 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  opponent.handCount = 5;
  if (effect === "loan-repaid-after-deletion") {
    you.trash.push(card("demo-chirinmon-card", "BT1-058", 0));
  } else {
    you.battleArea.push(permanent("demo-chirinmon", "BT1-058", 0, 7000));
  }
  state.players.push(you, opponent);

  if (effect !== "loan-repaid-after-deletion") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-058",
        effectKey: "BT1-058/memory-loan",
        description: "Chirinmon's delayed payment still lost 3 memory after it left the battle area.",
        timing: "OnEndTurn",
      },
    ],
  };
}
