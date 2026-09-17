import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function demiDevimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-demidevimon-bt2-played", "BT2-067", 0, 3000));
  } else if (effect === "digivolved") {
    const evolved = permanent("demo-demidevimon-bt2-digivolved", "BT2-067", 0, 3000, [
      { instanceId: "demo-demidevimon-bt2-pagumon", cardId: "BT2-007" },
    ]);
    evolved.inBreeding = true;
    you.breeding = evolved;
    you.hand.push(card("demo-demidevimon-bt2-drawn", "BT2-068", 0));
    you.handCount = 1;
  } else {
    const redBase = permanent("demo-demidevimon-bt2-red-base", "BT1-001", 0, 0);
    redBase.inBreeding = true;
    you.breeding = redBase;
    you.hand.push(card("demo-demidevimon-bt2-illegal", "BT2-067", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "DemiDevimon was played for 2 memory as a 3000 DP Digimon with no effects.",
    digivolved: "DemiDevimon digivolved from a purple level 2 for 0 memory and drew 1 card.",
    "wrong-color": "DemiDevimon cannot use its purple evolution requirement on a red level 2.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-067",
        effectKey: `BT2-067/${effect}`,
        description: descriptions[effect] ?? "DemiDevimon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}
