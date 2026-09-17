import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function hagurumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-hagurumon-bt2-played", "BT2-052", 0, 3000));
  } else if (effect === "digivolved") {
    you.battleArea.push(
      permanent("demo-hagurumon-bt2-digivolved", "BT2-052", 0, 3000, [
        { instanceId: "demo-hagurumon-bt2-kapurimon", cardId: "BT2-005" },
      ]),
    );
    you.hand.push(card("demo-hagurumon-bt2-drawn", "BT2-053", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-hagurumon-bt2-red-base", "BT1-001", 0, 0));
    you.hand.push(card("demo-hagurumon-bt2-illegal", "BT2-052", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "Hagurumon was played for 2 memory as a 3000 DP Digimon with no effects.",
    digivolved: "Hagurumon digivolved from a black level 2 for 0 memory and drew 1 card.",
    "wrong-color": "Hagurumon cannot use its black evolution requirement on a red level 2.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-052",
        effectKey: `BT2-052/${effect}`,
        description: descriptions[effect] ?? "Hagurumon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}
