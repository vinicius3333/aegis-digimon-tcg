import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function numemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-numemon-bt2-played", "BT2-056", 0, 3000));
  } else if (effect === "digivolved") {
    you.battleArea.push(
      permanent("demo-numemon-bt2-digivolved", "BT2-056", 0, 3000, [
        { instanceId: "demo-numemon-bt2-hagurumon", cardId: "BT2-052" },
      ]),
    );
    you.hand.push(card("demo-numemon-bt2-drawn", "BT2-053", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-numemon-bt2-red-base", "BT1-009", 0, 3000));
    you.hand.push(card("demo-numemon-bt2-illegal", "BT2-056", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "Numemon was played for 3 memory as a 3000 DP Digimon with no effects.",
    digivolved: "Numemon digivolved from a black level 3 for 1 memory and drew 1 card.",
    "wrong-color": "Numemon cannot use its black evolution requirement on a red level 3.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-056",
        effectKey: `BT2-056/${effect}`,
        description: descriptions[effect] ?? "Numemon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}
