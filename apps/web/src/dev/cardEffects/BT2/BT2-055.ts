import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function toyAgumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "rebooted" ? Phase.Active : Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "rebooted" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "top-card") {
    you.battleArea.push(permanent("demo-toyagumon-bt2-top", "BT2-055", 0, 1000));
  } else {
    const host = permanent("demo-toyagumon-bt2-host", "BT2-065", 0, 11000, [
      { instanceId: "demo-toyagumon-bt2-source", cardId: "BT2-055" },
    ]);
    host.keywords.push("Reboot");
    host.isSuspended = effect !== "rebooted";
    you.battleArea.push(host);
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    inherited: "ToyAgumon's inherited Reboot was active, but it did not immediately unsuspend the host.",
    rebooted: "The inherited Reboot unsuspended the host during the opponent's unsuspend phase.",
    "top-card": "ToyAgumon did not have Reboot while it was the top card because the effect is inherited-only.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-055",
        effectKey: "BT2-055/inherited-reboot",
        description: descriptions[effect] ?? "ToyAgumon's inherited effect state is displayed.",
        timing: "AllTurns",
      },
    ],
  };
}
