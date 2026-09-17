import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function geoGreymonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-geogreymon-bt2-host", "BT2-038", 0, 7000, [
      { instanceId: "demo-geogreymon-bt2-source", cardId: "BT2-035" },
    ]),
    permanent("demo-geogreymon-bt2-tamer-a", "BT1-087", 0, 0),
    permanent("demo-geogreymon-bt2-tamer-b", "BT1-087", 0, 0),
  );
  if (effect !== "two-yellow-tamers") {
    you.battleArea.push(permanent("demo-geogreymon-bt2-tamer-c", "BT1-087", 0, 0));
  }
  if (effect === "dp-zero-deletion") {
    opponent.trash.push(card("demo-geogreymon-bt2-deleted", "BT2-034", 1));
  } else {
    opponent.battleArea.push(
      permanent("demo-geogreymon-bt2-target", "BT2-043", 1, effect === "minus-2000" ? 4000 : 6000),
    );
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "minus-2000": "The host attacked with 3 yellow Tamers, giving the selected opposing Digimon -2000 DP for the turn.",
    "two-yellow-tamers": "Only 2 yellow Tamers are in play, so GeoGreymon's inherited effect did not apply.",
    "dp-zero-deletion": "GeoGreymon's -2000 DP reduced Salamon to 0 DP, so the rule check deleted it.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-035",
        effectKey: "BT2-035/inherited-dp-minus",
        description: descriptions[effect] ?? "GeoGreymon's inherited effect state is displayed.",
        timing: "When Attacking",
      },
    ],
  };
}
