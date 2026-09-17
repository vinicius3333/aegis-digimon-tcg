import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function imperialdramonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "full-cost" ? 1 : 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const imperial = permanent("demo-bt3-031-imperial", "BT3-031", 0, 12000);
  imperial.keywords.push("Jamming");
  const paildramon = permanent("demo-bt3-031-paildramon", "BT3-027", 0, 7000);
  paildramon.keywords.push("Jamming");
  paildramon.isSuspended = false;
  const other = permanent("demo-bt3-031-other", "BT3-021", 0, 2000);
  other.keywords.push("Jamming");
  other.isSuspended = false;
  you.battleArea.push(imperial, paildramon, other);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-031",
        effectKey: `BT3-031/${effect ?? "resolved"}`,
        description:
          effect === "full-cost"
            ? "Imperialdramon was digivolved over a non-eligible level 5 or outside the battle area; the full cost applied."
            : "Imperialdramon reduced the eligible digivolution cost by 2 and unsuspended all of your Digimon with Jamming.",
        timing: "WhenDigivolving",
      },
    ],
  };
}
