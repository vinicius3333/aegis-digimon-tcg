import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function silphymonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const silphymon = permanent("demo-silphymon", "BT3-014", 0, 7000);
  const eligible = permanent("demo-silphymon-target", "BT1-016", 1, effect === "resolved" ? 1000 : 5000);
  const other = permanent("demo-silphymon-other", "BT1-010", 1, 2000);
  you.battleArea.push(silphymon);
  opponent.battleArea.push(eligible, other);
  state.players.push(you, opponent);
  if (effect === "choose-target") {
    return {
      state,
      decision: {
        decisionId: "demo-silphymon-dp-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Change 1 opposing level 4 or lower Digimon's original DP to 1000",
        sourceCardId: "BT3-014",
        options: {
          candidateInstanceIds: [eligible.permanentId, other.permanentId],
          visibleInstanceIds: [eligible.permanentId, other.permanentId],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: "Change the original DP of 1 of your opponent's level 4 or lower Digimon to 1000 for the turn.",
        },
      },
    };
  }
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-014",
        effectKey: `BT3-014/${effect ?? "resolved"}`,
        description:
          effect === "yellow"
            ? "During its controller's turn, Silphymon is treated as both red and yellow."
            : "Silphymon's When Digivolving effect overwrote one opposing original DP to 1000 for the turn.",
        timing: effect === "yellow" ? "YourTurn" : "WhenDigivolving",
      },
    ],
  };
}
