import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function metalGreymonBt1Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "attacking" ? Phase.Main : Phase.End;
  state.turnCount = 5;
  state.turnSeat = effect === "inherited-opponent-turn" ? 1 : 0;
  state.memory = effect === null ? 2 : effect === "attacking" ? -3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "inherited-own-turn" || effect === "inherited-opponent-turn") {
    you.battleArea.push(
      permanent("demo-metalgreymon-host", "BT1-115", 0, effect === "inherited-own-turn" ? 13000 : 10000, [
        { instanceId: "demo-metalgreymon-source", cardId: "BT1-114" },
      ]),
    );
  } else {
    const attacker = permanent("demo-metalgreymon", "BT1-114", 0, 9000);
    attacker.isSuspended = effect === "attacking" || effect === "q990-resolved";
    you.battleArea.push(attacker);
  }
  opponent.securityCount = effect === "q990-resolved" ? 1 : 4;
  if (effect === "q990-resolved") {
    opponent.trash.push(
      card("demo-metalgreymon-check-1", "BT1-009", 1),
      card("demo-metalgreymon-check-2", "BT1-010", 1),
      card("demo-metalgreymon-check-3", "BT1-011", 1),
    );
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    attacking:
      "MetalGreymon's attack was legal at 2 memory. Its When Attacking effect moved memory to -3, but the attack continued (Q990).",
    "q990-resolved":
      "MetalGreymon completed all 3 security checks from Security Attack +2 before the memory gauge changed the turn (Q990).",
    "inherited-own-turn": "MetalGreymon's inherited effect gave its red host +3000 DP during its owner's turn.",
    "inherited-opponent-turn":
      "On the opponent's turn, MetalGreymon's inherited +3000 DP no longer applied to its host.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-114",
        effectKey: effect.startsWith("inherited") ? "BT1-114/your-turn-dp" : "BT1-114/attack-cost",
        description: descriptions[effect] ?? "BT1-114 MetalGreymon resolved.",
        timing: effect.startsWith("inherited") ? "Your Turn" : "When Attacking",
      },
    ],
  };
}
