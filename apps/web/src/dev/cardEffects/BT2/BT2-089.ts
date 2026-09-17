import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function taiKamiyaBlackBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn-boost" ? 1 : 0;
  state.memory = effect === "above-threshold" ? 4 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-tai-black-bt2", "BT2-089", 0, 0));
  if (effect === "opponent-turn-boost" || effect === "controller-turn") {
    you.battleArea.push(
      permanent("demo-tai-black-bt2-own-black", "BT2-063", 0, effect === "opponent-turn-boost" ? 12000 : 11000),
      permanent("demo-tai-black-bt2-own-red", "BT1-010", 0, 4000),
    );
    opponent.battleArea.push(permanent("demo-tai-black-bt2-opposing-black", "BT2-063", 1, 11000));
  }
  state.players.push(you, opponent);

  const selected = effect ?? "two-memory";
  const descriptions: Record<string, string> = {
    "two-memory": "At the exact 2-memory boundary, Tai set the controller's memory to 3.",
    "negative-memory": "At the start of the turn with negative memory, Tai set it to 3.",
    "above-threshold": "Memory was already above 2, so Tai did not lower it.",
    "opponent-turn-boost": "On the opponent's turn, only the controller's black Digimon received +1000 DP.",
    "controller-turn": "On Tai's controller's turn, the black Digimon received no DP bonus.",
    "security-played": "Tai's Security effect played him without paying the memory cost.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-089",
        effectKey: `BT2-089/${selected}`,
        description: descriptions[selected]!,
        timing:
          selected === "security-played" ? "Security" : selected.includes("turn") ? "OpponentsTurn" : "StartOfYourTurn",
      },
    ],
  };
}
