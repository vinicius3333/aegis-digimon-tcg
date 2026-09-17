import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function myotismonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-myotismon-bt2-played", "BT2-075", 0, 7000));
  } else if (effect === "digivolved") {
    you.battleArea.push(
      permanent("demo-myotismon-bt2-digivolved", "BT2-075", 0, 7000, [
        { instanceId: "demo-myotismon-bt2-devimon", cardId: "BT2-074" },
      ]),
    );
    you.hand.push(card("demo-myotismon-bt2-drawn", "BT2-068", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-myotismon-bt2-red-base", "BT1-015", 0, 4000));
    you.hand.push(card("demo-myotismon-bt2-illegal", "BT2-075", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "Myotismon was played for 6 memory as a 7000 DP Digimon with no effects.",
    digivolved: "Myotismon digivolved from a purple level 4 for 2 memory and drew 1 card.",
    "wrong-color": "Myotismon cannot use its purple evolution requirement on a red level 4.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-075",
        effectKey: `BT2-075/${effect}`,
        description: descriptions[effect] ?? "Myotismon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}
