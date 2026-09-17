import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function cherubimonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const cherubimon = permanent("demo-bt3-041-cherubimon", "BT3-041", 0, 11000);
  const recovered = card("demo-bt3-041-recovered", "BT3-033", 0);
  if (effect === "resolved") {
    recovered.faceUp = false;
    you.security.push(recovered);
  } else {
    you.trash.push(recovered);
    you.security.push(
      card("demo-bt3-041-security-1", "BT1-011", 0),
      card("demo-bt3-041-security-2", "BT1-012", 0),
      card("demo-bt3-041-security-3", "BT1-013", 0),
    );
  }
  you.battleArea.push(cherubimon);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-041",
        effectKey: `BT3-041/${effect ?? "resolved"}`,
        description:
          effect === "declined"
            ? "Cherubimon found no eligible recovery because the security count was above 3."
            : "Cherubimon placed a yellow Digimon from trash face down on top of security.",
        timing: "WhenAttacking",
      },
    ],
  };
}
