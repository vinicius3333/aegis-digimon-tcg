import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function infermonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = effect === "reduced" || effect === "wrong-name" ? 7 : 6;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const evolvedCardId = effect === "wrong-name" ? "BT2-065" : "BT2-082";
  const evolvedDP = effect === "wrong-name" ? 12000 : 10000;
  const evolved = permanent("demo-infermon-bt2-evolved", evolvedCardId, 0, evolvedDP, [
    { instanceId: "demo-infermon-bt2-source", cardId: "BT2-062" },
  ]);
  if (effect === "breeding") {
    evolved.inBreeding = true;
    you.breeding = evolved;
  } else {
    you.battleArea.push(evolved);
  }
  state.players.push(you, opponent);

  const descriptions: Record<string, string> = {
    reduced: "Infermon reduced the hand digivolution cost into Diaboromon from 4 to 3 memory.",
    breeding: "Infermon in the breeding area did not reduce Diaboromon's digivolution cost.",
    "wrong-name": "Infermon did not reduce the cost because the evolved Digimon was not named Diaboromon.",
    "opponent-turn": "Infermon did not reduce Diaboromon's cost during the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-062",
        effectKey: `BT2-062/${effect ?? "reduced"}`,
        description: descriptions[effect ?? "reduced"]!,
        timing: effect === "opponent-turn" ? "OpponentsTurn" : "YourTurn",
      },
    ],
  };
}
