import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function shineGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponents-turn" ? 1 : 0;
  state.memory = effect === "q1230-single-timing" ? -1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const boosted = effect === "tamer-dp-boost";
  you.battleArea.push(permanent("demo-shinegreymon-bt2", "BT2-041", 0, boosted ? 13000 : 11000));
  if (effect === "q1014-separate-targets") {
    you.battleArea.push(
      permanent("demo-shinegreymon-bt2-tamer-a", "BT1-087", 0, 0),
      permanent("demo-shinegreymon-bt2-tamer-b", "BT2-087", 0, 0),
    );
    you.battleArea.slice(1).forEach((permanent) => {
      permanent.isSuspended = true;
    });
    opponent.trash.push(
      card("demo-shinegreymon-bt2-target-a", "BT2-034", 1),
      card("demo-shinegreymon-bt2-target-b", "BT2-033", 1),
    );
  } else if (effect === "q1230-single-timing") {
    you.battleArea.push(
      permanent("demo-shinegreymon-bt2-tamer-a", "BT1-087", 0, 0),
      permanent("demo-shinegreymon-bt2-tamer-b", "BT2-087", 0, 0),
    );
    you.battleArea.slice(1).forEach((permanent) => {
      permanent.isSuspended = true;
    });
    opponent.battleArea.push(
      permanent("demo-shinegreymon-bt2-neo-host", "BT4-085", 1, 7000, [
        { instanceId: "demo-shinegreymon-bt2-neo-source", cardId: "BT4-084" },
      ]),
    );
  } else {
    you.battleArea.push(
      permanent("demo-shinegreymon-bt2-yellow-tamer", "BT1-087", 0, 0),
      permanent("demo-shinegreymon-bt2-red-tamer", "BT1-085", 0, 0),
    );
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "q1014-separate-targets":
      "Q1014: suspending 2 yellow Tamers created 2 separate -4000 DP activations, deleting 2 chosen 4000 DP Digimon.",
    "q1230-single-timing":
      "Q1015/Q1230: both Tamers suspended at one timing, so the opposing NeoDevimon inherited effect gained only 1 memory.",
    "tamer-dp-boost": "On its controller's turn, ShineGreymon gains +1000 DP for each Tamer of any color in play.",
    "opponents-turn": "Two Tamers are in play, but ShineGreymon's DP bonus is inactive on the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-041",
        effectKey: effect.startsWith("q10") ? "BT2-041/when-digivolving" : "BT2-041/tamer-dp-boost",
        description: descriptions[effect] ?? "ShineGreymon's conditional effect state is displayed.",
        timing: effect.startsWith("q10") ? "When Digivolving" : "Your Turn",
      },
    ],
  };
}
