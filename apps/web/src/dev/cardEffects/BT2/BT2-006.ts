import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function tsumemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const active = effect === "q995-same-name";
  you.battleArea.push(
    permanent("demo-tsumemon-host", "BT2-009", 0, active ? 5000 : 3000, [
      { instanceId: "demo-tsumemon-source", cardId: "BT2-006" },
    ]),
  );
  if (effect === "q995-same-name" || effect === "opponent-turn") {
    you.battleArea.push(permanent("demo-tsumemon-same-name", "BT2-009", 0, 3000));
  } else if (effect === "different-name") {
    you.battleArea.push(permanent("demo-tsumemon-different-name", "BT2-008", 0, 3000));
  } else if (effect === "opponent-same-name") {
    opponent.battleArea.push(permanent("demo-tsumemon-opponent-same-name", "BT2-009", 1, 3000));
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "q995-same-name":
      "Another allied Guilmon matched the evolved host's current name, so Tsumemon granted the host +2000 DP (Q995).",
    "different-name": "The allied Digimon had a different name, so Tsumemon's inherited DP bonus stayed inactive.",
    "opponent-same-name": "An opponent's Guilmon did not satisfy Tsumemon's requirement for another allied Digimon.",
    "opponent-turn":
      "Two allied Guilmon shared a name, but Tsumemon's Your Turn bonus stayed inactive on the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-006",
        effectKey: "BT2-006/same-name-dp",
        description: descriptions[effect] ?? "BT2-006 Tsumemon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}
