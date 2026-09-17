import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function kapurimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hasReboot = effect !== "without-reboot";
  const boosted = hasReboot && effect !== "opponent-turn";
  you.battleArea.push(
    permanent("demo-kapurimon-host", hasReboot ? "BT2-065" : "BT2-062", 0, boosted ? 8000 : 7000, [
      { instanceId: "demo-kapurimon-source", cardId: "BT2-005" },
    ]),
  );
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    active: "During its owner's turn, Kapurimon gave its Reboot host +1000 DP.",
    "without-reboot": "The host did not have Reboot, so Kapurimon's inherited +1000 DP stayed inactive.",
    "opponent-turn": "The host had Reboot, but Kapurimon's Your Turn DP bonus stayed inactive on the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-005",
        effectKey: "BT2-005/reboot-dp",
        description: descriptions[effect] ?? "BT2-005 Kapurimon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}
