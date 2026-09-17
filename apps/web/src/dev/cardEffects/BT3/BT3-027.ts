import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function paildramonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const imperial = permanent("demo-bt3-027-imperial", "BT3-031", 0, 12000);
  imperial.stack.push(card("demo-bt3-027-inherited", "BT3-027", 0));
  imperial.keywords.push("Jamming");
  imperial.isSuspended = effect !== "resolved";
  you.battleArea.push(imperial);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-027",
        effectKey: `BT3-027/${effect ?? "resolved"}`,
        description:
          effect === "non-imperial"
            ? "Paildramon's inherited effect did not unsuspend a non-Imperialdramon host."
            : "Paildramon's inherited effect unsuspended Imperialdramon; Jamming remains active.",
        timing: "WhenAttacking",
      },
    ],
  };
}
