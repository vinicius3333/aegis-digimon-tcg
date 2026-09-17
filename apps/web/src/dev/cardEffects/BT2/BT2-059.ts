import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function kurisarimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "matched" || effect === "simultaneous" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-kurisarimon-bt2-host", effect === "simultaneous" ? "BT2-082" : "BT2-054", 0, 4000);
  host.stack.push(card("demo-kurisarimon-bt2-source", "BT2-059", 0));
  you.battleArea.push(host);
  if (effect === "matched") you.battleArea.push(permanent("demo-kurisarimon-bt2-match", "BT2-054", 0, 4000));
  if (effect === "different") you.battleArea.push(permanent("demo-kurisarimon-bt2-different", "BT2-059", 0, 4000));
  if (effect === "simultaneous") {
    you.battleArea.push(permanent("demo-kurisarimon-bt2-token-a", "TOKEN-DIABOROMON", 0, 3000));
    you.battleArea.push(permanent("demo-kurisarimon-bt2-token-b", "TOKEN-DIABOROMON", 0, 3000));
  }
  state.players.push(you, opponent);

  const description =
    effect === "matched"
      ? "A Digimon matching the host's name was played. Kurisarimon gained 1 memory."
      : effect === "simultaneous"
        ? "Two Diaboromon Tokens were played in one timing. Kurisarimon triggered once and gained 1 memory."
        : effect === "opponent-turn"
          ? "The matching Digimon was played during the opponent's turn, so Kurisarimon did not trigger."
          : "Kurisarimon was played, but the inherited effect compares against the evolved host's name and did not trigger.";

  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-059",
        effectKey: `BT2-059/${effect ?? "different"}`,
        description,
        timing: effect === "opponent-turn" ? "OpponentsTurn" : "YourTurn",
      },
    ],
  };
}
