import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function gatomonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const gatomon = permanent("demo-gatomon-bt2", "BT2-036", 0, effect === "ally-deleted" ? 6000 : 3000);
  you.battleArea.push(gatomon);
  if (effect === "on-play-minus") {
    you.battleArea.push(permanent("demo-gatomon-bt2-purple", "BT2-067", 0, 3000));
    opponent.battleArea.push(permanent("demo-gatomon-bt2-target", "BT1-074", 1, 3000));
  } else if (effect === "no-purple") {
    opponent.battleArea.push(permanent("demo-gatomon-bt2-target", "BT1-074", 1, 7000));
  } else if (effect === "ally-deleted") {
    you.trash.push(card("demo-gatomon-bt2-deleted-ally", "BT2-067", 0));
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "on-play-minus": "With a purple Digimon in play, Gatomon's On Play effect gave the opposing Digimon -4000 DP.",
    "no-purple": "Without an allied purple Digimon in play, Gatomon's On Play DP reduction did not apply.",
    "ally-deleted": "Another allied Digimon was deleted during the turn, so Gatomon gained +3000 DP for the turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-036",
        effectKey: effect === "ally-deleted" ? "BT2-036/ally-deletion-boost" : "BT2-036/on-play-dp-minus",
        description: descriptions[effect] ?? "Gatomon's conditional effect state is displayed.",
        timing: effect === "ally-deleted" ? "Your Turn" : "On Play",
      },
    ],
  };
}
