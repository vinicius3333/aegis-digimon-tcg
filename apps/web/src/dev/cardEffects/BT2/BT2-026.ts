import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function veedramonJammingBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect !== "deleted-without-jamming") {
    const veedramon = permanent("demo-veedramon-jamming-bt2", "BT2-026", 0, 5000);
    veedramon.isSuspended = effect === "survived-security";
    you.battleArea.push(veedramon);
  } else {
    you.trash.push(card("demo-veedramon-jamming-bt2-deleted", "BT2-026", 0));
  }
  if (effect === "active" || effect === "opponent-turn" || effect === "survived-security") {
    you.battleArea.push(permanent("demo-veedramon-jamming-bt2-blue-tamer", "BT1-086", 0, 0));
  } else if (effect === "red-tamer") {
    you.battleArea.push(permanent("demo-veedramon-jamming-bt2-red-tamer", "BT1-085", 0, 0));
  }
  if (effect === "survived-security" || effect === "deleted-without-jamming") {
    opponent.securityCount = 4;
    opponent.trash.push(card("demo-veedramon-jamming-bt2-security", "BT1-080", 1));
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    active: "During its owner's turn, an allied blue Tamer granted Veedramon Jamming.",
    "red-tamer": "The allied Tamer was red, so Veedramon did not gain Jamming.",
    "opponent-turn": "Despite the blue Tamer, Veedramon's Your Turn Jamming was inactive on the opponent's turn.",
    "survived-security": "With Jamming active, Veedramon survived battle against a 12000 DP Security Digimon.",
    "deleted-without-jamming":
      "Without a blue Tamer and Jamming, the 5000 DP Veedramon lost to the 12000 DP Security Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-026",
        effectKey: "BT2-026/blue-tamer-jamming",
        description: descriptions[effect] ?? "BT2-026 Veedramon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}
