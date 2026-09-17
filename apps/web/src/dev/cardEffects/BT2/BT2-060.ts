import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function megadramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-megadramon-bt2-played", "BT2-060", 0, 9000));
  } else if (effect === "digivolved") {
    you.battleArea.push(
      permanent("demo-megadramon-bt2-digivolved", "BT2-060", 0, 9000, [
        { instanceId: "demo-megadramon-bt2-guardromon", cardId: "BT2-058" },
      ]),
    );
    you.hand.push(card("demo-megadramon-bt2-drawn", "BT2-053", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-megadramon-bt2-red-base", "BT1-015", 0, 4000));
    you.hand.push(card("demo-megadramon-bt2-illegal", "BT2-060", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "Megadramon was played for 6 memory as a 9000 DP Digimon with no effects.",
    digivolved: "Megadramon digivolved from a black level 4 for 3 memory and drew 1 card.",
    "wrong-color": "Megadramon cannot use its black evolution requirement on a red level 4.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-060",
        effectKey: `BT2-060/${effect}`,
        description: descriptions[effect] ?? "Megadramon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}
