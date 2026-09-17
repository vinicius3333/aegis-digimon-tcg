import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function shieldOfTheJustBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "red-tamer-8000" || effect === "above-8000" || effect === "security-8000") {
    you.battleArea.push(permanent("demo-shield-just-red-tamer", "BT2-084", 0, 0));
  } else if (effect === "non-red-tamer") {
    you.battleArea.push(permanent("demo-shield-just-blue-tamer", "BT2-085", 0, 0));
  }
  if (effect === null || effect === "base-5000") {
    opponent.trash.push(card("demo-shield-just-deleted", "BT1-035", 1));
  } else if (effect === "red-tamer-8000" || effect === "security-8000") {
    opponent.trash.push(card("demo-shield-just-deleted", "BT1-062", 1));
  } else if (effect === "above-8000") {
    opponent.battleArea.push(permanent("demo-shield-just-survivor", "BT1-059", 1, 9000));
  } else {
    opponent.battleArea.push(permanent("demo-shield-just-survivor", "BT1-019", 1, 6000));
  }
  if (effect !== "security-8000") you.trash.push(card("demo-shield-just-option", "BT2-093", 0));
  state.players.push(you, opponent);

  const selected = effect ?? "base-5000";
  const descriptions: Record<string, string> = {
    "base-5000": "Without a red Tamer, Shield of the Just deleted a Digimon at the 5000 DP boundary.",
    "above-5000": "Without a red Tamer, the opposing 6000 DP Digimon was above the deletion threshold.",
    "red-tamer-8000": "With a red Tamer, the replacement threshold deleted an opposing 8000 DP Digimon.",
    "above-8000": "Even with a red Tamer, the opposing 9000 DP Digimon was above the replacement threshold.",
    "non-red-tamer": "A blue Tamer did not enable the 8000 DP threshold, so the 6000 DP Digimon survived.",
    "security-8000":
      "The Security effect activated Main and used the red-Tamer threshold to delete the 8000 DP Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-093",
        effectKey: `BT2-093/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "security-8000" ? "Security" : "Main",
      },
    ],
  };
}
