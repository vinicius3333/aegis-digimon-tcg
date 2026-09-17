import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function shakkoumonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "your-turn" ? 0 : 1;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const shakkoumon = permanent("demo-bt3-040-shakkoumon", "BT3-040", 0, 7000);
  const target = permanent("demo-bt3-040-target", "BT1-019", 1, 4000);
  if (effect !== "with-source") target.keywords.push("SecurityAttack");
  if (effect === "with-source") target.stack.push(card("demo-bt3-040-source", "BT1-010", 1));
  you.battleArea.push(shakkoumon);
  opponent.battleArea.push(target);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-040",
        effectKey: `BT3-040/${effect ?? "opponent-turn"}`,
        description:
          effect === "your-turn"
            ? "On your turn, Shakkoumon is treated as both yellow and blue."
            : "On the opponent's turn, opposing Digimon with no digivolution cards gain Security Attack -1.",
        timing: effect === "your-turn" ? "YourTurn" : "OpponentTurn",
      },
    ],
  };
}
