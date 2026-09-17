import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function vikemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponents-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const active = effect !== "sourced-opponent" && effect !== "opponents-turn";
  you.battleArea.push(permanent("demo-vikemon-bt2", "BT2-031", 0, active ? 13000 : 12000));
  opponent.battleArea.push(
    permanent(
      "demo-vikemon-bt2-opponent",
      "BT1-010",
      1,
      3000,
      effect === "sourced-opponent" ? [{ instanceId: "demo-vikemon-bt2-source", cardId: "BT1-001" }] : [],
    ),
  );
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    active: "Vikemon has 13000 DP and Security Attack +1 while an opposing source-less Digimon is in play.",
    "sourced-opponent":
      "The opposing Digimon has a digivolution card, so Vikemon remains at 12000 DP without Security Attack +1.",
    "opponents-turn": "The condition is present, but this is the opponent's turn, so Vikemon remains at 12000 DP.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-031",
        effectKey: "BT2-031/conditional-bonuses",
        description:
          descriptions[effect] ??
          "Vikemon has 13000 DP and Security Attack +1 while an opposing source-less Digimon is in play.",
        timing: "Your Turn",
      },
    ],
  };
}
