import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function kokuwamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "security-attack-active" ? 0 : 1;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-kokuwamon-host", "BT1-081", 0, 11000, [{ instanceId: "demo-kokuwamon-source", cardId: "BT1-068" }]),
  );
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "security-attack-active") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-068",
        effectKey: "BT1-068/level-six-security-attack",
        description: "Kokuwamon's inherited effect grants Security Attack +1 to its level 6 host during your turn.",
        timing: "Static",
      },
    ],
  };
}
