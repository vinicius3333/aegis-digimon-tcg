import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function slashAngemonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "target-deleted" ? 0 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent(
      "demo-slash-angemon",
      effect === "target-deleted" ? "BT1-062" : "BT1-059",
      0,
      effect === "target-deleted" ? 8000 : 9000,
    ),
  );
  if (effect === "target-deleted") {
    opponent.trash.push(card("demo-slash-angemon-target-card", "BT1-064", 1));
  } else {
    opponent.battleArea.push(permanent("demo-slash-angemon-target", "BT1-064", 1, 8000));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "target-deleted") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-062",
        effectKey: "BT1-062/dp-minus",
        description: "SlashAngemon gave the opposing Digimon -8000 DP, deleting it at 0 DP.",
        timing: "WhenDigivolving",
      },
    ],
  };
}
