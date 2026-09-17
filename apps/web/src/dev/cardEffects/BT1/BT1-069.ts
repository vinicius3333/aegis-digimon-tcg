import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function ogremonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-ogremon", "BT1-069", 0, 4000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "jamming") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-069",
        effectKey: "BT1-069/jamming",
        description: "Ogremon has Jamming and survives losing battles against Security Digimon.",
        timing: "Static",
      },
    ],
  };
}
