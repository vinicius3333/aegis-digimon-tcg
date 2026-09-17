import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function seraphimonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "recovered" ? 0 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.securityCount = effect === "recovered" ? 4 : 3;
  you.deckCount = effect === "recovered" ? 35 : 36;
  you.battleArea.push(
    permanent(
      "demo-seraphimon",
      effect === "recovered" ? "BT1-063" : "BT1-059",
      0,
      effect === "recovered" ? 10000 : 9000,
    ),
  );
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "recovered") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-063",
        effectKey: "BT1-063/recovery",
        description: "Seraphimon recovered the top deck card and has Security Attack +1 with 3 or more security.",
        timing: "WhenDigivolving",
      },
    ],
  };
}
