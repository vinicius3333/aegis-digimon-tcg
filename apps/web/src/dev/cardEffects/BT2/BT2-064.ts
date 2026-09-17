import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function hiAndromonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "played") {
    you.battleArea.push(permanent("demo-hiandromon-bt2-played", "BT2-064", 0, 12000));
  } else if (effect === "digivolved") {
    you.battleArea.push(
      permanent("demo-hiandromon-bt2-digivolved", "BT2-064", 0, 12000, [
        { instanceId: "demo-hiandromon-bt2-metalgreymon", cardId: "BT2-063" },
      ]),
    );
    you.hand.push(card("demo-hiandromon-bt2-drawn", "BT2-053", 0));
    you.handCount = 1;
  } else {
    you.battleArea.push(permanent("demo-hiandromon-bt2-red-base", "BT1-020", 0, 6000));
    you.hand.push(card("demo-hiandromon-bt2-illegal", "BT2-064", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    played: "HiAndromon was played for 10 memory as a 12000 DP Digimon with no effects.",
    digivolved: "HiAndromon digivolved from a black level 5 for 2 memory and drew 1 card.",
    "wrong-color": "HiAndromon cannot use its black evolution requirement on a red level 5.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-064",
        effectKey: `BT2-064/${effect}`,
        description: descriptions[effect] ?? "HiAndromon's card state is displayed.",
        timing: "Main",
      },
    ],
  };
}
